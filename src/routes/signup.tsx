import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/signup')({
  component: RouteComponent,
});

function RouteComponent() {
  const deeplinkUrl = import.meta.env.VITE_DEEPLINK_URL;
  const search = Route.useSearch();
  const searchParams = new URLSearchParams(search);
  const inviteToken = searchParams.get('inviteToken');

  return (
    <>
      <h2>You've been invited!</h2>
      <p>
        <strong>Testing</strong> wants to connect with you on PayTab to split
        expenses.
      </p>
      <p>Sign up now to start tracking shared expenses together.</p>
      <p>
        <a href={`${deeplinkUrl}/signup?inviteToken=${inviteToken}`}>
          Join PayTab
        </a>
      </p>
    </>
  );
}
