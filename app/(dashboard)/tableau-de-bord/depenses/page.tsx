"use client";

import { BanIcon, PlusIcon, ReceiptIcon } from "lucide-react";
import { useState } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { EmptyState, ErrorState, ListSkeleton, Money, StatCard, VoidDialog, useTarget } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateExpense, useExpenseCategories, useExpenses, useVoidExpense } from "@/client/hooks";
import { useSession } from "@/client/session";
import { useNow } from "@/client/use-now";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD } from "@/shared/domain/labels";
import { formatDate } from "@/shared/format";
import { expenseSchema, type ExpenseInput } from "@/shared/schemas/staff";

export default function ExpensesPage() {
  const { can } = useSession();
  const canSeeAll = can({ expense: ["read"] });
  const expenses = useExpenses();
  const voidExpense = useVoidExpense();
  const target = useTarget<string>();
  const [open, setOpen] = useState(false);
  const monthAgo = useNow() - 30 * 86400_000;
  const month = (expenses.data ?? []).filter((e) => !e.voided && new Date(e.date).getTime() > monthAgo).reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <PageHeader
        title="Dépenses"
        description={canSeeAll ? "Loyer, salaires, électricité, transport et petit matériel." : "Enregistrez les dépenses payées depuis la boutique."}
        actions={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Nouvelle dépense
          </Button>
        }
      />
      {canSeeAll ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="30 derniers jours" value={<Money value={month} />} icon={ReceiptIcon} loading={expenses.isLoading} />
          </div>
          {expenses.isLoading ? (
            <ListSkeleton />
          ) : expenses.isError ? (
            <ErrorState onRetry={() => expenses.refetch()} />
          ) : !expenses.data?.length ? (
            <EmptyState icon={ReceiptIcon} title="Aucune dépense" />
          ) : (
            <Card className="rounded-2xl py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Date</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="hidden md:table-cell">Note</TableHead>
                    <TableHead className="hidden sm:table-cell">Moyen</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="w-0 pr-5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.data.map((e) => (
                    <TableRow key={e.id} className={cn(e.voided && "opacity-60")}>
                      <TableCell className="pl-5 whitespace-nowrap">{formatDate(e.date)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{e.category.name}</p>
                        <p className="text-xs text-muted-foreground">{e.createdBy}</p>
                        {e.voided && <ToneBadge tone="danger" className="mt-1">Annulée : {e.voided.reason}</ToneBadge>}
                      </TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">{e.note ?? "—"}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{PAYMENT_METHOD[e.method]}</TableCell>
                      <TableCell className="text-right">
                        <Money value={e.amount} className={cn("font-semibold", e.voided && "line-through")} />
                      </TableCell>
                      <TableCell className="pr-5">
                        {can({ expense: ["void"] }) && !e.voided && (
                          <Button variant="ghost" size="icon" aria-label="Annuler la dépense" onClick={() => target.open(e.id)}>
                            <BanIcon />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      ) : (
        <EmptyState
          icon={ReceiptIcon}
          title="Enregistrer une dépense"
          description="Le détail des dépenses et les totaux sont réservés à l'administrateur."
          action={<Button onClick={() => setOpen(true)}>Nouvelle dépense</Button>}
        />
      )}
      <ExpenseDialog open={open} onOpenChange={setOpen} />
      <VoidDialog
        open={target.isOpen}
        onOpenChange={(o) => !o && target.close()}
        title="Annuler cette dépense ?"
        description="La dépense reste visible, barrée, avec le motif."
        onConfirm={(reason) => voidExpense.mutateAsync({ id: target.target!, reason })}
      />
    </>
  );
}

function ExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateExpense();
  const categories = useExpenseCategories();
  const initial = (): ExpenseInput => ({ date: new Date().toISOString().slice(0, 10), categoryId: "", amount: 0, method: "cash", note: "" });
  const form = useAppForm({
    defaultValues: initial(),
    validators: { onSubmit: expenseSchema },
    onSubmit: async ({ value }) => {
      await create.mutateAsync(value);
      onOpenChange(false);
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) form.reset(initial());
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onFormSubmit(form)} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nouvelle dépense</DialogTitle>
            <DialogDescription>Une dépense ne se supprime pas : l&apos;administrateur peut l&apos;annuler avec un motif.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.AppField name="date">{(f) => <f.TextField label="Date" type="date" />}</form.AppField>
              <form.AppField name="categoryId">
                {(f) => <f.SelectField label="Catégorie" options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />}
              </form.AppField>
              <form.AppField name="amount">{(f) => <f.MoneyField label="Montant" />}</form.AppField>
              <form.AppField name="method">
                {(f) => <f.SelectField label="Payé par" options={Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label }))} />}
              </form.AppField>
            </div>
            <form.AppField name="note">{(f) => <f.TextareaField label="Note" rows={2} placeholder="Ex. taxi pour récupérer des écrans" />}</form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton>Enregistrer</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
