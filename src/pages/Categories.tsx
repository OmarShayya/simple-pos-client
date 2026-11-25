import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Box, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { CategoryOutlined, DeleteOutlineRounded, EditOutlined } from "@mui/icons-material";
import { DataTable, FormDialog, PageHeader, SegmentedControl, StatusChip } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import ImageUploadField from "@/components/products/ImageUploadField";
import { useAllProducts, useCategories, useCategoryMutations } from "@/components/products/productQueries";
import { useConfirm } from "@/hooks/useConfirm";
import { plural } from "@/utils/format";
import type { Category } from "@/types/category.types";

type Show = "active" | "removed";

const CategoryFormDialog: React.FC<{ open: boolean; category: Category | null; onClose: () => void }> = ({ open, category, onClose }) => {
  const { create, update } = useCategoryMutations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setImage(category?.image || undefined);
    setTouched(false);
  }, [open, category]);

  const nameError = touched && name.trim().length < 2 ? "Enter a name, e.g. Cold drinks" : undefined;
  const submit = () => {
    setTouched(true);
    if (name.trim().length < 2) return;
    const data = { name: name.trim(), description: description.trim(), image: image ?? null };
    if (category) update.mutate({ id: category.id, data }, { onSuccess: onClose });
    else create.mutate({ name: data.name, description: data.description || undefined, image }, { onSuccess: onClose });
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={category ? `Edit ${category.name}` : "Add category"}
      onSubmit={submit}
      submitLabel={category ? "Save changes" : "Add category"}
      loading={create.isPending || update.isPending}
      submitDisabled={uploading}
    >
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus={!category} error={Boolean(nameError)} helperText={nameError} slotProps={{ htmlInput: { maxLength: 50 } }} />
        <TextField label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 200 } }} />
        <ImageUploadField value={image} onChange={setImage} folder="categories" onUploadingChange={setUploading} />
      </Stack>
    </FormDialog>
  );
};

/** Product categories (drinks, snacks…): what groups the counter grid and the website menu. */
const Categories: React.FC = () => {
  const confirm = useConfirm();
  const q = useCategories(true);
  const products = useAllProducts();
  const { remove } = useCategoryMutations();
  const [show, setShow] = useState<Show>("active");
  const [form, setForm] = useState<{ category: Category | null } | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products.data ?? []) if (p.category?.id) m.set(p.category.id, (m.get(p.category.id) ?? 0) + 1);
    return m;
  }, [products.data]);

  const all = q.data ?? [];
  const removedCount = all.filter((c) => !c.isActive).length;
  const rows = all.filter((c) => (show === "active" ? c.isActive : !c.isActive));

  const askRemove = async (c: Category) => {
    const n = counts.get(c.id) ?? 0;
    const ok = await confirm({
      title: `Remove ${c.name}?`,
      message: n
        ? `${plural(n, "product")} still use it. They stay on sale, but the category disappears from the counter and the website menu.`
        : "It disappears from the counter and the website menu.",
      confirmLabel: "Remove category",
      tone: "danger",
    });
    if (ok) remove.mutate(c);
  };

  const columns: DataTableColumn<Category>[] = [
    {
      field: "name",
      header: "Category",
      flex: 1.2,
      minWidth: 200,
      mobile: "title",
      render: (c) => (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar src={c.image} variant="rounded" alt="" sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "action.hover", color: "text.secondary", display: { xs: "none", sm: "flex" } }}>
            <CategoryOutlined fontSize="small" />
          </Avatar>
          <Typography component="span" sx={{ fontWeight: 500 }} noWrap>
            {c.name}
          </Typography>
        </Stack>
      ),
      value: (c) => c.name,
    },
    { field: "description", header: "Description", flex: 2, minWidth: 200, mobile: "subtitle", hideBelow: "md" },
    { field: "products", header: "Products", type: "number", value: (c) => (products.data ? counts.get(c.id) ?? 0 : null), width: 120 },
    {
      field: "isActive",
      header: "Status",
      width: 120,
      value: (c) => (c.isActive ? "active" : "inactive"),
      render: (c) => <StatusChip status={c.isActive ? "active" : "inactive"} kind="generic" label={c.isActive ? "Active" : "Removed"} />,
      mobile: "end",
    },
    { field: "createdAt", header: "Added", type: "date", width: 130, hideBelow: "lg", mobile: "hidden" },
    {
      field: "actions",
      header: "Actions",
      type: "actions",
      width: 112,
      render: (c) => (
        <>
          <Tooltip title="Edit category">
            <IconButton aria-label={`Edit ${c.name}`} onClick={() => setForm({ category: c })}>
              <EditOutlined />
            </IconButton>
          </Tooltip>
          {c.isActive && (
            <Tooltip title="Remove category">
              <IconButton aria-label={`Remove ${c.name}`} onClick={() => askRemove(c)} sx={{ color: "error.main" }}>
                <DeleteOutlineRounded />
              </IconButton>
            </Tooltip>
          )}
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Categories" subtitle="Groups for the counter screen and the website menu (Hot drinks, Snacks…)." />
      <DataTable<Category>
        label="Categories"
        rows={rows}
        columns={columns}
        loading={q.isLoading}
        refreshing={q.isFetching && !q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onRefresh={() => {
          q.refetch();
          products.refetch();
        }}
        search={{ placeholder: "Search categories" }}
        filters={
          removedCount > 0 && (
            <SegmentedControl<Show>
              aria-label="Show"
              value={show}
              onChange={setShow}
              options={[
                { value: "active", label: "Active" },
                { value: "removed", label: "Removed", count: removedCount },
              ]}
            />
          )
        }
        initialSort={{ field: "name", direction: "asc" }}
        primaryAction={{ label: "Add category", onClick: () => setForm({ category: null }) }}
        onRowClick={(c) => setForm({ category: c })}
        empty={{ title: show === "removed" ? "No removed categories" : "No categories yet", description: "Create a category to group your products, e.g. Hot drinks, Snacks." }}
      />
      <CategoryFormDialog open={Boolean(form)} category={form?.category ?? null} onClose={() => setForm(null)} />
    </Box>
  );
};

export default Categories;
