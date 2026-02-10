# Google Tag Manager Complete Setup Guide

## Overview
This guide will help you set up Google Tag Manager (GTM) for Mavrixfy to track user behavior, improve SEO, and appear in trending searches.

## Step 1: Create Google Tag Manager Account

1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Click "Create Account"
3. Fill in:
   - **Account Name**: Mavrixfy
   - **Country**: Your country
   - **Container Name**: mavrixfy.site
   - **Target Platform**: Web
4. Click "Create"
5. Accept Terms of Service

## Step 2: Get Your GTM Container ID

After creation, you'll see two code snippets:
- **GTM-XXXXXXX** (your container ID)
- Head code snippet
- Body code snippet

**Save these codes!**

## Step 3: Install GTM Code

### Already Done! ✅
Your site already has Google Analytics (G-FQJS8LREP5) installed in `frontend/index.html`.

### Add GTM Code (Additional Tracking)

Replace the existing Google Analytics code with GTM for better control:

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
```

And in the body:
```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

## Step 4: Configure Tags in GTM Dashboard

### A. Google Analytics 4 Tag

1. In GTM, click "Tags" → "New"
2. Name: "GA4 - Page View"
3. Tag Configuration:
   - Choose "Google Analytics: GA4 Configuration"
   - Measurement ID: `G-FQJS8LREP5` (your existing GA ID)
4. Triggering: All Pages
5. Save

### B. Track Music Plays

1. Create Tag: "GA4 - Music Play Event"
2. Tag Type: "Google Analytics: GA4 Event"
3. Configuration Tag: Select your GA4 config tag
4. Event Name: `music_play`
5. Event Parameters:
   - `song_title`: {{Song Title Variable}}
   - `artist_name`: {{Artist Name Variable}}
   - `song_id`: {{Song ID Variable}}
6. Trigger: Custom Event - `musicPlay`
7. Save

### C. Track Playlist Creation

1. Create Tag: "GA4 - Playlist Created"
2. Tag Type: "Google Analytics: GA4 Event"
3. Event Name: `playlist_created`
4. Event Parameters:
   - `playlist_name`: {{Playlist Name Variable}}
   - `song_count`: {{Song Count Variable}}
5. Trigger: Custom Event - `playlistCreated`
6. Save

### D. Track Search Queries

1. Create Tag: "GA4 - Search Event"
2. Tag Type: "Google Analytics: GA4 Event"
3. Event Name: `search`
4. Event Parameters:
   - `search_term`: {{Search Term Variable}}
5. Trigger: Custom Event - `searchPerformed`
6. Save

### E. Track Social Shares

1. Create Tag: "GA4 - Share Event"
2. Tag Type: "Google Analytics: GA4 Event"
3. Event Name: `share`
4. Event Parameters:
   - `content_type`: {{Content Type Variable}}
   - `item_id`: {{Item ID Variable}}
   - `method`: {{Share Method Variable}}
5. Trigger: Custom Event - `contentShared`
6. Save

## Step 5: Create Variables

### User-Defined Variables

1. **Song Title Variable**
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `songTitle`

2. **Artist Name Variable**
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `artistName`

3. **Song ID Variable**
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `songId`

4. **Search Term Variable**
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `searchTerm`

5. **Content Type Variable**
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `contentType`

## Step 6: Create Triggers

### Custom Event Triggers

1. **Music Play Trigger**
   - Trigger Type: Custom Event
   - Event Name: `musicPlay`

2. **Playlist Created Trigger**
   - Trigger Type: Custom Event
   - Event Name: `playlistCreated`

3. **Search Performed Trigger**
   - Trigger Type: Custom Event
   - Event Name: `searchPerformed`

4. **Content Shared Trigger**
   - Trigger Type: Custom Event
   - Event Name: `contentShared`

## Step 7: Implement DataLayer Events in Code

I'll create a tracking service for you to use throughout your app.

## Step 8: Test Your Setup

1. In GTM, click "Preview"
2. Enter: `https://mavrixfy.site`
3. Test each event:
   - Play a song
   - Create a playlist
   - Search for music
   - Share content
4. Verify events appear in GTM debugger

## Step 9: Publish Container

1. Click "Submit" in GTM
2. Add Version Name: "Initial Setup"
3. Add Description: "Basic tracking setup"
4. Click "Publish"

## Step 10: Advanced Tracking for Trending

### Enhanced Ecommerce Tracking (for Music)

Track popular songs and trending content:

```javascript
// Track song impressions
dataLayer.push({
  event: 'view_item_list',
  ecommerce: {
    items: [{
      item_id: 'song_123',
      item_name: 'Song Title',
      item_category: 'Music',
      item_category2: 'Bollywood',
      item_brand: 'Artist Name',
      price: 0.00
    }]
  }
});

// Track song plays (conversions)
dataLayer.push({
  event: 'select_item',
  ecommerce: {
    items: [{
      item_id: 'song_123',
      item_name: 'Song Title',
      item_category: 'Music'
    }]
  }
});
```

## Step 11: SEO Enhancements for Trending

### A. Add Trending Schema Markup

Already implemented in your SEO setup! The structured data helps Google understand your content.

### B. Create Trending Pages

Create dedicated pages for:
- `/trending` - Trending songs
- `/trending/bollywood` - Trending Bollywood
- `/trending/punjabi` - Trending Punjabi
- `/new-releases` - New releases

### C. Update Sitemap

Add trending pages to sitemap (I'll do this for you).

## Step 12: Monitor Performance

### Google Search Console
- Submit sitemap
- Monitor search queries
- Track click-through rates

### Google Analytics 4
- Track user engagement
- Monitor popular content
- Analyze user flow

### GTM Dashboard
- Monitor tag firing
- Check for errors
- Review event data

## Expected Results

### Week 1-2
- ✅ GTM tracking active
- ✅ Events being recorded
- ✅ Basic analytics data

### Month 1
- ✅ Trending content identified
- ✅ User behavior patterns clear
- ✅ SEO improvements visible

### Month 2-3
- ✅ Appearing in search results
- ✅ Trending searches showing your site
- ✅ Organic traffic growing

## Pro Tips for Trending

1. **Content Freshness**: Update trending content daily
2. **Social Signals**: Encourage sharing
3. **User Engagement**: Track time on site, plays per session
4. **Mobile Optimization**: Already done! ✅
5. **Page Speed**: Optimize for Core Web Vitals
6. **Backlinks**: Share on social media, music forums
7. **Rich Snippets**: Use structured data (already implemented)

## Troubleshooting

### Tags Not Firing
- Check GTM preview mode
- Verify dataLayer events
- Check browser console for errors

### No Data in Analytics
- Wait 24-48 hours for data
- Verify GA4 measurement ID
- Check GTM container is published

### Not Appearing in Search
- Submit sitemap to Search Console
- Wait 1-2 weeks for indexing
- Create quality content
- Build backlinks

## Next Steps

1. Get your GTM container ID
2. I'll update the code with GTM integration
3. Configure tags in GTM dashboard
4. Test and publish
5. Monitor results

Ready to implement? Let me know your GTM container ID!
