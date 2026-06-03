/*
  Warnings:

  - Made the column `fromName` on table `Ticket` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "fromName" SET NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;
