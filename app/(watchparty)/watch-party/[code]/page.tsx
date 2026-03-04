import WatchPartyRoom from "./WatchPartyRoom";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <WatchPartyRoom code={code} />;
}
