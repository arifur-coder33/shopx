import DynamicTable from "@/components/common/DynamicTables/Index";

export default async function AdminListPage({
  title,
  tableProperties,
  fetchAction,
  fetchParams = {},
  deleteAction,
  updateAction,
  getCountAction,
  filterSearchProperties = [],
  filterTagProperties = [],
  initialLimit = 10,
  quickViewComponentKey = "",
  viewPageURL = "",
  itemAddFormKey = "",
  itemUpdateFormKey = "",
  editable = true,
}) {
  const { success, data, nextCursor, error } = await fetchAction({
    limit: initialLimit,
    tableProperties,
    ...fetchParams,
  });

  if (!success) return `Something went wrong: ${error}`;

  return (
    <div className="p-4">
      <DynamicTable
        tableName={title}
        initialData={data}
        initialNextCursor={nextCursor}
        fetchAction={fetchAction}
        tableProperties={tableProperties}
        filterSearchProperties={filterSearchProperties}
        filterTagProperties={filterTagProperties}
        initialItemsPerPage={initialLimit}
        itemsPerPageOptions={[5, 10, 25, 50, 100]}
        quickViewComponentKey={quickViewComponentKey}
        viewPageURL={viewPageURL}
        getDataCount={getCountAction}
        actions={{
          itemAddFormKey,
          itemUpdateFormKey,
          quickViewComponentKey,
          updateAction,
          deleteAction,
          isEditabel: editable,
          viewPageURL,
        }}
      />
    </div>
  );
}
