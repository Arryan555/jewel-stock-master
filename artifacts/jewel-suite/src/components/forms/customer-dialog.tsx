import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateCustomer,
  useUpdateCustomer,
  getListCustomersQueryKey,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CustomerFormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  type: "retail" | "wholesale";
  gstNumber: string;
  openingBalance: string;
}

const blank: CustomerFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  type: "retail",
  gstNumber: "",
  openingBalance: "0",
};

export interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<CustomerFormValues> & { id?: string };
}

export function CustomerDialog({
  open,
  onOpenChange,
  initial,
}: CustomerDialogProps) {
  const isEdit = !!initial?.id;
  const [values, setValues] = useState<CustomerFormValues>(blank);
  const { toast } = useToast();
  const qc = useQueryClient();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();

  useEffect(() => {
    if (open) {
      setValues({
        ...blank,
        ...initial,
        openingBalance: String(initial?.openingBalance ?? "0"),
      });
    }
  }, [open, initial]);

  function update_<K extends keyof CustomerFormValues>(
    key: K,
    v: CustomerFormValues[K],
  ) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name || !values.phone) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    const data = {
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      type: values.type,
      gstNumber: values.gstNumber || undefined,
      openingBalance: parseFloat(values.openingBalance) || 0,
    };
    try {
      if (isEdit && initial?.id) {
        await update.mutateAsync({ id: initial.id, data });
        await qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        await qc.invalidateQueries({
          queryKey: getGetCustomerQueryKey(initial.id),
        });
        toast({ title: "Customer updated" });
      } else {
        await create.mutateAsync({ data });
        await qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        toast({ title: "Customer added" });
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Could not save customer",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px]"
        data-testid="dialog-customer"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isEdit ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
          <DialogDescription>
            Maintain contact, type and opening balance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name *">
              <Input
                value={values.name}
                onChange={(e) => update_("name", e.target.value)}
                data-testid="input-customer-name"
              />
            </Field>
            <Field label="Phone *">
              <Input
                value={values.phone}
                onChange={(e) => update_("phone", e.target.value)}
                data-testid="input-customer-phone"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={values.email}
                onChange={(e) => update_("email", e.target.value)}
                data-testid="input-customer-email"
              />
            </Field>
            <Field label="City">
              <Input
                value={values.city}
                onChange={(e) => update_("city", e.target.value)}
                data-testid="input-customer-city"
              />
            </Field>
            <Field label="Type">
              <Select
                value={values.type}
                onValueChange={(v) =>
                  update_("type", v as "retail" | "wholesale")
                }
              >
                <SelectTrigger data-testid="select-customer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="GSTIN">
              <Input
                value={values.gstNumber}
                onChange={(e) => update_("gstNumber", e.target.value)}
                data-testid="input-customer-gst"
              />
            </Field>
            <Field label="Opening Balance (₹)">
              <Input
                type="number"
                step="0.01"
                value={values.openingBalance}
                onChange={(e) => update_("openingBalance", e.target.value)}
                data-testid="input-customer-opening"
              />
            </Field>
          </div>
          <Field label="Address">
            <Textarea
              rows={2}
              value={values.address}
              onChange={(e) => update_("address", e.target.value)}
              data-testid="input-customer-address"
            />
          </Field>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-customer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
              data-testid="button-save-customer"
            >
              {create.isPending || update.isPending
                ? "Saving..."
                : isEdit
                ? "Save changes"
                : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}
