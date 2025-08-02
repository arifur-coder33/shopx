const SkeletonRow = ({ columns }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </td>
    ))}
  </tr>
);

export default function TableSkeleton({ rows = 10, columns = 5 }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
