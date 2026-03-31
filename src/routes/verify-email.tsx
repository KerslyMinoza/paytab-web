import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/verify-email')({
  component: RouteComponent,
});

function RouteComponent() {
  const deeplinkUrl =
    import.meta.env.VITE_DEEPLINK_URL || 'exp://192.168.254.118:8081/--';
  const search = Route.useSearch();
  const searchParams = new URLSearchParams(search);
  const token = searchParams.get('token');

  return (
    <div>
      <h2>Welcome to PayTab!</h2>
      <p>Please verify your email address to get started.</p>
      <p>
        <a href={`${deeplinkUrl}/verify-email?token=${token}`}>Verify Email</a>
      </p>
      <p>
        If you didn't create a PayTab account, you can safely ignore this email.
      </p>
    </div>
  );
}
