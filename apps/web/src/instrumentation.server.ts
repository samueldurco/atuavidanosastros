// Eagerly prepare immutable editorial content during Worker startup. Route imports
// are lazy, so preparing it there would charge the first request's CPU budget.
import './lib/server/editorial-registry';
