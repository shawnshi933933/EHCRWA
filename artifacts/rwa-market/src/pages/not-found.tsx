import { Link } from 'wouter';
import { StateBox } from '@/components/shell';
import { usePageMeta } from '@/lib/format';

export default function NotFound() {
  usePageMeta('Page not found · EHC DEX', 'This page does not exist on EHC DEX.');
  return (
    <div className="nf">
      <StateBox kind="notfound" title="This page does not exist" action={<Link href="/market-map" className="btn btn-primary" data-testid="link-nf-map">Open Market Map</Link>}>
        The address may be mistyped, or the page has moved.
      </StateBox>
    </div>
  );
}
