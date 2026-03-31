import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/friend-request')({
  component: RouteComponent,
});

function RouteComponent() {
  const deeplinkUrl = import.meta.env.VITE_DEEPLINK_URL;
  const search = Route.useSearch();
  const searchParams = new URLSearchParams(search);
  const friendshipId = searchParams.get('friendshipId');

  return (
    <>
      <h2>Friend Request</h2>
      <p>
        <strong>Testing</strong> wants to connect with you on PayTab to split
        expenses.
      </p>
      <p>Open PayTab to accept the request.</p>
      <p>
        <a href={`${deeplinkUrl}/friend-request?friendshipId=${friendshipId}`}>
          View Request
        </a>
      </p>
    </>
  );
}
