export enum AuthStatus {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
    REGISTRATION_SUCCESS = 'REGISTRATION_SUCCESS',
    USER_INACTIVE = 'USER_INACTIVE',
    EMAIL_VERIFICATION_SENT = 'EMAIL_VERIFICATION_SENT',
}

export const AuthErrorMessages = {
    INVALID_CREDENTIALS: 'Invalid credentials',
    USER_NOT_FOUND: 'User not found',
    USER_INACTIVE: 'User is inactive',
    USER_ALREADY_EXISTS: 'User already exists',
    USER_ALREADY_COMPLETED: 'User already completed registration',
    INVALID_REFRESH_TOKEN: 'Invalid refresh token',
    REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
    INVALID_GOOGLE_TOKEN: 'Invalid Google token payload',
    GOOGLE_TOKEN_EXPIRED: 'Google authentication token has expired. Please try signing in again.',
    GOOGLE_TOKEN_INVALID: 'Invalid Google authentication token. Please try signing in again.',
    GOOGLE_AUTH_FAILED: 'Google authentication failed. Please try signing in with Google again.',
} as const;

export const AuthSuccessMessages = {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'User logged out',
    REGISTRATION_SUCCESS: 'Registration successful',
    REGISTRATION_COMPLETED: 'Registration completed successfully',
    USER_INACTIVE: 'User is inactive. Please verify your email to activate your account.',
    EMAIL_VERIFICATION_SENT: 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada.',
    EMAIL_VERIFICATION_COMPLETE: 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada para completar o cadastro.',
    EMAIL_ALREADY_VERIFIED: 'Email já verificado.',
} as const;

export const AuthLogs = {
    LOGIN_ATTEMPT: 'User login attempt',
    LOGIN_SUCCESS: 'User logged in successfully',
    GOOGLE_LOGIN_ATTEMPT: 'Google login attempt',
    GOOGLE_LOGIN_SUCCESS: 'Google login successful',
    GOOGLE_LOGIN_ERROR: (error: string) => `Error during Google login: ${error}`,
    TOKEN_REFRESH_ATTEMPT: 'Token refresh attempt',
    TOKEN_REFRESH_SUCCESS: 'Token refreshed successfully',
    LOGOUT: (userId: string) => `User logging out: ${userId}`,
    LOGOUT_SUCCESS: (userId: string) => `User logged out successfully: ${userId}`,
    REGISTRATION_ATTEMPT: 'Creating new user registration',
    REGISTRATION_SUCCESS: 'User registered successfully',
    COMPLETE_REGISTRATION_ATTEMPT: 'Completing user registration',
    COMPLETE_REGISTRATION_SUCCESS: 'User registration completed successfully',
} as const;
