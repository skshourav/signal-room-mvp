/*
  Warnings:

  - Made the column `maxLossPct` on table `ClientAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phase1TargetPct` on table `ClientAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phase2TargetPct` on table `ClientAccount` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ClientAccount" ALTER COLUMN "maxLossPct" SET NOT NULL,
ALTER COLUMN "phase1TargetPct" SET NOT NULL,
ALTER COLUMN "phase2TargetPct" SET NOT NULL;
