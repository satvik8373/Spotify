import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Clerk authentication callback
export const authCallback = async (req, res, next) => {
	try {
		const { id, firstName, lastName, imageUrl } = req.body;

		// check if user already exists
		const user = await User.findOne({ clerkId: id });

		if (!user) {
			// signup
			await User.create({
				clerkId: id,
				fullName: `${firstName || ""} ${lastName || ""}`.trim(),
				imageUrl: imageUrl || "https://res.cloudinary.com/djqq8kba8/image/upload/v1/spotify-clone/defaults/user_default.png",
				authType: "clerk",
			});
		}

		res.status(200).json({ success: true });
	} catch (error) {
		console.log("Error in auth callback", error);
		next(error);
	}
};

// MongoDB user registration
export const register = async (req, res, next) => {
	try {
		const { fullName, email, password } = req.body;

		// Validation
		if (!fullName || !email || !password) {
			return res.status(400).json({
				success: false,
				message: "All fields are required",
			});
		}

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: "User with this email already exists",
			});
		}

		// Hash password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Create user
		const user = await User.create({
			fullName,
			email,
			password: hashedPassword,
			authType: "mongodb",
		});

		// Remove password from response
		user.password = undefined;

		return res.status(201).json({
			success: true,
			message: "User registered successfully",
			user,
		});
	} catch (error) {
		console.log("Error in registration", error);
		next(error);
	}
};

// MongoDB user login
export const login = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		// Validation
		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: "Email and password are required",
			});
		}

		// Find user with password
		const user = await User.findOne({ email, authType: "mongodb" }).select("+password");
		if (!user) {
			return res.status(401).json({
				success: false,
				message: "Invalid email or password",
			});
		}

		// Verify password
		const isPasswordMatch = await bcrypt.compare(password, user.password);
		if (!isPasswordMatch) {
			return res.status(401).json({
				success: false,
				message: "Invalid email or password",
			});
		}

		// Generate JWT token
		const token = jwt.sign(
			{ userId: user._id },
			process.env.JWT_SECRET || "your-secret-key",
			{ expiresIn: "30d" }
		);

		// Remove password from response
		user.password = undefined;

		return res.status(200).json({
			success: true,
			message: "Login successful",
			token,
			user,
		});
	} catch (error) {
		console.log("Error in login", error);
		next(error);
	}
};

// Verify JWT token and get user info
export const verifyToken = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		
		if (!token) {
			return res.status(401).json({
				success: false,
				message: "No token provided",
			});
		}
		
		// Verify the token
		const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
		
		// Get user info from decoded token
		const user = await User.findById(decoded.userId);
		
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}
		 
		// Return user info
		return res.status(200).json({
			success: true,
			user,
		});
	} catch (error) {
		if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
			return res.status(401).json({
				success: false,
				message: "Invalid or expired token",
			});
		}
		
		console.log("Error in verify token:", error);
		next(error);
	}
};
