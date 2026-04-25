import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey ||
      clientEmail.includes('xxxxx') || privateKey.includes('YOUR_PRIVATE_KEY')) {
    throw new Error('Firebase Admin credentials not configured.');
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export async function POST(req: NextRequest) {
  try {
    const app = getAdminApp();
    const db  = getFirestore(app);
    const { title, message, imageUrl, route, notificationId } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    // Collect all enabled native FCM tokens (skip Expo tokens)
    const usersSnap = await db.collection('users').get();
    const tokens: { token: string; platform: string }[] = [];

    for (const userDoc of usersSnap.docs) {
      const tokensSnap = await userDoc.ref.collection('pushTokens').get();
      for (const t of tokensSnap.docs) {
        const d = t.data();
        if (!d.enabled || !d.nativePushToken) continue;
        if (d.nativePushToken.startsWith('ExponentPushToken')) continue;
        if (d.nativePushTokenType === 'expo') continue;
        tokens.push({ token: d.nativePushToken, platform: d.platform || 'android' });
      }
    }

    if (tokens.length === 0) {
      if (notificationId) {
        await db.collection('notifications').doc(notificationId).update({ delivered: 0, status: 'no_tokens' });
      }
      return NextResponse.json({ delivered: 0, total: 0, message: 'No registered devices found' });
    }

    const messaging = getMessaging(app);
    const invalidTokens: string[] = [];
    let delivered = 0;

    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);

      const messages = batch.map(({ token, platform }) => {
        const base: any = {
          token,
          notification: { title, body: message, ...(imageUrl ? { imageUrl } : {}) },
          data: {
            ...(route ? { route } : {}),
            ...(notificationId ? { notificationId } : {}),
          },
        };

        if (platform === 'web') {
          base.webpush = {
            notification: {
              title,
              body: message,
              icon: '/mavrixfy-icons/mavrixfy-icon-maskable-192.png',
              ...(imageUrl ? { image: imageUrl } : {}),
              requireInteraction: false,
            },
            fcmOptions: { link: route ? `/${route}` : '/' },
          };
        } else if (platform === 'android') {
          base.android = {
            priority: 'high',
            notification: { channelId: 'mavrixfy-default', sound: 'default' },
          };
        } else if (platform === 'ios') {
          base.apns = { payload: { aps: { sound: 'default', badge: 1 } } };
        }

        return base;
      });

      const response = await messaging.sendEach(messages);
      delivered += response.successCount;

      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(batch[idx].token);
          }
        }
      });
    }

    // Disable stale tokens
    if (invalidTokens.length > 0) {
      for (const userDoc of usersSnap.docs) {
        const tokensSnap = await userDoc.ref.collection('pushTokens').get();
        for (const t of tokensSnap.docs) {
          if (invalidTokens.includes(t.data().nativePushToken)) {
            await t.ref.update({ enabled: false });
          }
        }
      }
    }

    if (notificationId) {
      await db.collection('notifications').doc(notificationId).update({ delivered, status: 'sent' });
    }

    return NextResponse.json({ delivered, total: tokens.length });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
