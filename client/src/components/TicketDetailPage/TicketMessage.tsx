import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  body: string;
};

export function TicketMessage({ body }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Message</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{body}</p>
      </CardContent>
    </Card>
  );
}
