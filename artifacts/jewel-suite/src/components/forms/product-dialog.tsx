import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateProduct,
  useUpdateProduct,
  getListProductsQueryKey,
  getGetProductQueryKey,
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
import { useToast } from "@/hooks/use-toast";

interface ProductFormValues {
  sku: string;
  name: string;
  category: string;
  metal: "gold" | "silver" | "diamond" | "platinum";
  purity: string;
  weightGrams: string;
  ratePerGram: string;
  makingChargePercent: string;
  stoneCharges: string;
  hsnCode: string;
  gstRate: string;
  stockQuantity: string;
}

const blank: ProductFormValues = {
  sku: "",
  name: "",
  category: "",
  metal: "gold",
  purity: "22K",
  weightGrams: "0",
  ratePerGram: "0",
  makingChargePercent: "0",
  stoneCharges: "0",
  hsnCode: "7113",
  gstRate: "3",
  stockQuantity: "1",
};

export interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<ProductFormValues> & { id?: string };
}

export function ProductDialog({
  open,
  onOpenChange,
  initial,
}: ProductDialogProps) {
  const isEdit = !!initial?.id;
  const [values, setValues] = useState<ProductFormValues>(blank);
  const { toast } = useToast();
  const qc = useQueryClient();
  const create = useCreateProduct();
  const update = useUpdateProduct();

  useEffect(() => {
    if (open) {
      setValues({
        ...blank,
        ...Object.fromEntries(
          Object.entries(initial ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)]),
        ),
        metal: (initial?.metal as ProductFormValues["metal"]) ?? "gold",
      } as ProductFormValues);
    }
  }, [open, initial]);

  function set<K extends keyof ProductFormValues>(
    key: K,
    v: ProductFormValues[K],
  ) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.sku || !values.name) {
      toast({ title: "SKU and name are required", variant: "destructive" });
      return;
    }
    const data = {
      sku: values.sku,
      name: values.name,
      category: values.category || "General",
      metal: values.metal,
      purity: values.purity,
      weightGrams: parseFloat(values.weightGrams) || 0,
      ratePerGram: parseFloat(values.ratePerGram) || 0,
      makingChargePercent: parseFloat(values.makingChargePercent) || 0,
      stoneCharges: parseFloat(values.stoneCharges) || 0,
      hsnCode: values.hsnCode || "7113",
      gstRate: parseFloat(values.gstRate) || 0,
      stockQuantity: parseInt(values.stockQuantity, 10) || 0,
    };
    try {
      if (isEdit && initial?.id) {
        await update.mutateAsync({ id: initial.id, data });
        await qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
        await qc.invalidateQueries({
          queryKey: getGetProductQueryKey(initial.id),
        });
        toast({ title: "Product updated" });
      } else {
        await create.mutateAsync({ data });
        await qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast({ title: "Product added" });
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Could not save product",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]" data-testid="dialog-product">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isEdit ? "Edit Item" : "Add Item to Inventory"}
          </DialogTitle>
          <DialogDescription>
            Set metal, purity, weight, rate, making and GST.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-3 gap-4">
            <Field label="SKU *">
              <Input
                value={values.sku}
                onChange={(e) => set("sku", e.target.value)}
                data-testid="input-product-sku"
              />
            </Field>
            <Field label="Category">
              <Input
                value={values.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Ring, Necklace..."
                data-testid="input-product-category"
              />
            </Field>
            <Field label="Stock Qty">
              <Input
                type="number"
                value={values.stockQuantity}
                onChange={(e) => set("stockQuantity", e.target.value)}
                data-testid="input-product-stock"
              />
            </Field>
          </div>
          <Field label="Item Name *">
            <Input
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              data-testid="input-product-name"
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Metal">
              <Select
                value={values.metal}
                onValueChange={(v) =>
                  set("metal", v as ProductFormValues["metal"])
                }
              >
                <SelectTrigger data-testid="select-product-metal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="diamond">Diamond</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Purity">
              <Input
                value={values.purity}
                onChange={(e) => set("purity", e.target.value)}
                placeholder="22K, 925..."
                data-testid="input-product-purity"
              />
            </Field>
            <Field label="HSN Code">
              <Input
                value={values.hsnCode}
                onChange={(e) => set("hsnCode", e.target.value)}
                data-testid="input-product-hsn"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Weight (g)">
              <Input
                type="number"
                step="0.001"
                value={values.weightGrams}
                onChange={(e) => set("weightGrams", e.target.value)}
                data-testid="input-product-weight"
              />
            </Field>
            <Field label="Rate / g (₹)">
              <Input
                type="number"
                step="0.01"
                value={values.ratePerGram}
                onChange={(e) => set("ratePerGram", e.target.value)}
                data-testid="input-product-rate"
              />
            </Field>
            <Field label="Making %">
              <Input
                type="number"
                step="0.01"
                value={values.makingChargePercent}
                onChange={(e) => set("makingChargePercent", e.target.value)}
                data-testid="input-product-making"
              />
            </Field>
            <Field label="Stones (₹)">
              <Input
                type="number"
                step="0.01"
                value={values.stoneCharges}
                onChange={(e) => set("stoneCharges", e.target.value)}
                data-testid="input-product-stones"
              />
            </Field>
            <Field label="GST %">
              <Input
                type="number"
                step="0.01"
                value={values.gstRate}
                onChange={(e) => set("gstRate", e.target.value)}
                data-testid="input-product-gst"
              />
            </Field>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-product"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
              data-testid="button-save-product"
            >
              {create.isPending || update.isPending
                ? "Saving..."
                : isEdit
                ? "Save changes"
                : "Add item"}
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
