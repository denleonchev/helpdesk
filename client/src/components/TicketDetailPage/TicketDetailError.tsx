import { Card, CardContent } from "@/components/ui/card";

type Props = {
  message: string;
};

export function TicketDetailError({ message }: Props) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
