import EditCardClient from './EditCardClient';

// For static export with client-side routing
export const dynamicParams = false;

export function generateStaticParams() {
  // Generate a placeholder page - actual routing happens via CloudFront rewrite rules
  return [{ cardId: '_placeholder' }];
}

export default function EditCardPage() {
  return <EditCardClient />;
}
