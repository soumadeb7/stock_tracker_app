type AuthResult = {
    success: boolean;
    message?: string;
};

export async function signInWithEmail(_: SignInFormData): Promise<AuthResult> {
    // Placeholder keeps auth pages functional until backend auth is integrated.
    return { success: true };
}

export async function signUpWithEmail(_: SignUpFormData): Promise<AuthResult> {
    // Placeholder keeps auth pages functional until backend auth is integrated.
    return { success: true };
}

export async function signOut(): Promise<void> {
    // Placeholder implementation keeps client logout flow stable when auth is not wired yet.
    return;
}
