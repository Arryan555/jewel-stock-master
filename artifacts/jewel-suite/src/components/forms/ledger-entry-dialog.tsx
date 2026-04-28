import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateLedgerEntry,
  getListLedgerEntriesQueryKey,
  getGetLedgerBalancesQueryKey,
  getGetCustomerQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function LedgerEntryDialog({
  open,
  onOpenChange,
  customerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}) {
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { toast } = useToast();
  const qc = useQueryClient();
  const create = useCreateLedgerEntry();

  useEffect(() => {
    if (open) {
      setType("debit");
      setAmount("0");
      setDescription("");
      setReference("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        data: {
          customerId,
          date: new Date(date).toISOString(),
          type,
          amount: parseFloat(amount) || 0,
          description,
          reference: reference || undefined,
        },
      });
      await qc.invalidateQueries({
        queryKey: getListLedgerEntriesQueryKey({ customerId }),
      });
      await qc.invalidateQueries({
        queryKey: getListLedgerEntriesQueryKey(),
      });
      await qc.invalidateQueries({
        queryKey: getGetLedgerBalancesQueryKey(),
      });
      await qc.invalidateQueries({
        queryKey: getGetCustomerQueryKey(customerId),
      });
      toast({ title: "Ledger entry added" });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Could not save",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" data-testid="dialog-ledger">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add Ledger Entry</DialogTitle>
          <DialogDescription>
            Debit when customer owes you. Credit when you owe customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </Label>
              <Select value={type} onValueChange={(v) => setType(v as "debit" | "credit")}>
                <SelectTrigger data-testid="select-ledger-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit (Dr) — they owe</SelectItem>
                  <SelectItem value="credit">Credit (Cr) — you owe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-ledger-date"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Amount (₹)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="input-ledger-amount"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description *
            </Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Repair charges, advance, settlement..."
              data-testid="input-ledger-description"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Reference (optional)
            </Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Slip no, cheque no..."
              data-testid="input-ledger-reference"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-ledger"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending}
              data-testid="button-save-ledger"
            >
              {create.isPending ? "Saving..." : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
