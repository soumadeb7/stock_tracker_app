type SessionUser = {
    id: string;
    name: string;
    email: string;
};

type Session = {
    user?: SessionUser;
} | null;

export const auth = {
    api: {
        async getSession(_: { headers: Headers }): Promise<Session> {
            // Placeholder auth adapter until real better-auth setup is added.
            return null;
        },
    },
};
