import {siteBrand} from '@/lib/site-brand';
export default function NotFound(){return <main lang="en" className="public-content"><header className="public-heading"><p>404 · {siteBrand('en')}</p><h1>Page not found</h1><p>This title or season is not available in the current public catalog.</p><a className="public-primary" href="/en">Back to the anime catalog</a></header></main>}
