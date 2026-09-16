import { batchReceive } from "#/workflows/pharmacy/batch-receive";
import { cndnIssue as issuePharmacyCndn } from "#/workflows/pharmacy/cndn-issue";
import { expiryAlerts } from "#/workflows/pharmacy/expiry-alerts";
import { getSale } from "#/workflows/pharmacy/get-sale";
import { grnVerify } from "#/workflows/pharmacy/grn-verify";
import { itemUpsert } from "#/workflows/pharmacy/item-upsert";
import { partialClose } from "#/workflows/pharmacy/partial-close";
import { piBook } from "#/workflows/pharmacy/pi-book";
import { poCreate } from "#/workflows/pharmacy/po-create";
import { reorderSuggest } from "#/workflows/pharmacy/reorder-suggest";
import { returnAgainstBill } from "#/workflows/pharmacy/return-against-bill";
import { saleFromRx } from "#/workflows/pharmacy/sale-from-rx";
import { stockCorrect } from "#/workflows/pharmacy/stock-correct";
import { stockLedger } from "#/workflows/pharmacy/stock-ledger";
import { transfer } from "#/workflows/pharmacy/transfer";
import { transferAccept } from "#/workflows/pharmacy/transfer-accept";

export const pharmacy = {
  batchReceive,
  cndnIssue: issuePharmacyCndn,
  expiryAlerts,
  getSale,
  grnVerify,
  itemUpsert,
  partialClose,
  piBook,
  poCreate,
  reorderSuggest,
  returnAgainstBill,
  saleFromRx,
  stockCorrect,
  stockLedger,
  transfer,
  transferAccept,
} as const;
