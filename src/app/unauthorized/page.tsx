export default function UnauthorizedPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground text-center space-y-4">
            <h1 className="text-4xl font-bold text-destructive">Unauthorized Access</h1>
            <p className="text-muted-foreground">You do not have the necessary permissions to view this page.</p>
            <a href="/dashboard" className="text-primary hover:underline font-bold">Go to Dashboard</a>
        </div>
    );
}
