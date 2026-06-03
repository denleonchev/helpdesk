-- AlterTable: change Ticket.id from String (cuid) to Int (autoincrement)
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_pkey";
ALTER TABLE "Ticket" DROP COLUMN "id";
ALTER TABLE "Ticket" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id");
