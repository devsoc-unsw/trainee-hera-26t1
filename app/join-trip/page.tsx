import { redirect } from "next/navigation";

type JoinTripPageProps = {
  searchParams: Promise<{ code?: string }>;
};

const JoinTripPage = async ({ searchParams }: JoinTripPageProps) => {
  const { code } = await searchParams;
  const trimmed = code?.trim();

  if (trimmed) {
    redirect(`/?code=${encodeURIComponent(trimmed)}`);
  }

  redirect("/");
};

export default JoinTripPage;
