/*
  Warnings:

  - A unique constraint covering the columns `[signalId,accountId]` on the table `Trade` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Trade_signalId_accountId_key" ON "Trade"("signalId", "accountId");
