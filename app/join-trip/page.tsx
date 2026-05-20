import { redirect } from "next/navigation";
import { Suspense } from "react";

type JoinTripPageProps = {
  searchParams: Promise<{ code?: string }>;
};

async function JoinTripRedirect({
  searchParams,
}: JoinTripPageProps): Promise<null> {
  const { code } = await searchParams;
  const trimmed = code?.trim();

  if (trimmed) {
    redirect(`/?code=${encodeURIComponent(trimmed)}`);
  }

  redirect("/");
  return null;
}

const JoinTripPage = (props: JoinTripPageProps) => {
  return (
    <Suspense fallback={null}>
      <JoinTripRedirect {...props} />
    </Suspense>
  );
};

export default JoinTripPage;
