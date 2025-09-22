import DynamicTableClient from "./DynamicTableClient";

/**
 * This is the primary Server Component entry point for the DynamicTable.
 * Its role is to be rendered on the server (SSG/SSR) and pass all data
 * and configuration down to the main client component.
 */
export default function DynamicTable(props) {
  // All props (data, tableProperties, actions, etc.) are passed through
  // to the client component which will handle all interactivity.
  return <DynamicTableClient {...props} />;
}
