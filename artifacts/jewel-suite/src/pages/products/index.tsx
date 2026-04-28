import { useListProducts, ListProductsMetal } from "@workspace/api-client-react";
import { formatCurrency, formatWeight } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, PackageSearch, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductDialog } from "@/components/forms/product-dialog";

export default function ProductsIndex() {
  const [search, setSearch] = useState("");
  const [metalFilter, setMetalFilter] = useState<ListProductsMetal>("all");
  const [open, setOpen] = useState(false);
  
  const { data: products, isLoading } = useListProducts({ 
    search: search || undefined, 
    metal: metalFilter 
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage stock, rates, and making charges</p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          onClick={() => setOpen(true)}
          data-testid="button-new-product"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      <ProductDialog open={open} onOpenChange={setOpen} />

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b flex flex-row items-center gap-4 space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by SKU, name, category..." 
              className="pl-9 bg-secondary/50 border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-[180px]">
            <Select value={metalFilter} onValueChange={(v) => setMetalFilter(v as ListProductsMetal)}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Metals" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metals</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item Details</TableHead>
                <TableHead>Metal / Purity</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Rate/g</TableHead>
                <TableHead className="text-center">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                        <PackageSearch className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p>No items found matching your criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products?.map((product) => (
                  <TableRow key={product.id} className="hover:bg-secondary/20 transition-colors group">
                    <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                      {product.sku}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category} • HSN: {product.hsnCode}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          product.metal === 'gold' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800' :
                          product.metal === 'silver' ? 'border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-800/50' : ''
                        }>
                          {product.metal}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{product.purity}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatWeight(product.weightGrams)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.ratePerGram)}
                      <p className="text-[10px] text-muted-foreground">+{product.makingChargePercent}% MC</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={product.stockQuantity > 0 ? "secondary" : "destructive"}>
                        {product.stockQuantity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
