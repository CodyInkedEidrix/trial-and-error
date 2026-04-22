// ──────────────────────────────────────────────────────────────────────
// Seed customers — 12 realistic records for first-ever load.
//
// The mix intentionally spans service trades (construction, cleaning,
// landscaping, handyman) + a couple of B2B relationships to show that
// the Customer shape serves any service-based business, not just one
// vertical.
//
// Notes are written in contractor shorthand — the kind of intelligence
// that separates a useful records system from a Rolodex. Timestamps are
// deliberately varied: recent for active work, months-stale for archived.
// ──────────────────────────────────────────────────────────────────────

import type { Customer } from '../types/customer'

/**
 * Builds the seed array at runtime so the relative timestamps read
 * naturally on whatever day the student first loads the app.
 */
export function buildSeedCustomers(): Customer[] {
  const now = Date.now()
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString()

  return [
    {
      id: 'seed-01',
      name: 'Sarah Okonkwo',
      status: 'active',
      phone: '(510) 555-0144',
      email: 'sarah.o@gmail.com',
      address: '1847 Chestnut St, Oakland CA',
      notes: 'gate code 4417 · dog Rex, friendly · prefers Thursdays',
      bidsCount: 3,
      jobsCount: 5,
      lastActivityAt: daysAgo(2),
      createdAt: daysAgo(180),
      updatedAt: daysAgo(2),
    },
    {
      id: 'seed-02',
      name: 'Miguel Barrera',
      company: 'Barrera & Sons Roofing',
      status: 'active',
      phone: '(408) 555-0192',
      email: 'miguel@barrerasons.com',
      address: '22 Industrial Way, San Jose CA',
      notes: 'subcontracts roofing — invoice net-30',
      bidsCount: 8,
      jobsCount: 12,
      lastActivityAt: daysAgo(1),
      createdAt: daysAgo(430),
      updatedAt: daysAgo(1),
    },
    {
      id: 'seed-03',
      name: 'Priya Raman',
      status: 'lead',
      email: 'priya.raman@protonmail.com',
      address: '90 Alta Vista Dr, Berkeley CA',
      notes: 'found us on Nextdoor · wants quote on deck rebuild',
      bidsCount: 0,
      jobsCount: 0,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      id: 'seed-04',
      name: 'Dana Whitfield',
      company: 'Alameda Property Management',
      status: 'active',
      phone: '(510) 555-0177',
      email: 'dana@alamedapm.com',
      address: '3200 Park Blvd, Alameda CA',
      notes: 'manages 14 units · prioritize tenant turnovers',
      bidsCount: 6,
      jobsCount: 9,
      lastActivityAt: daysAgo(7),
      createdAt: daysAgo(600),
      updatedAt: daysAgo(7),
    },
    {
      id: 'seed-05',
      name: 'Jerome Ashford',
      status: 'paused',
      phone: '(650) 555-0103',
      address: '14 Crestline Rd, Millbrae CA',
      notes: 'out of town until June · pick up on pool deck work then',
      bidsCount: 2,
      jobsCount: 3,
      lastActivityAt: daysAgo(45),
      createdAt: daysAgo(270),
      updatedAt: daysAgo(45),
    },
    {
      id: 'seed-06',
      name: 'Kei Tanaka',
      status: 'active',
      phone: '(415) 555-0188',
      email: 'kei.tanaka@me.com',
      address: '805 Divisadero St, San Francisco CA',
      notes: 'cash only · side door, buzzer broken',
      bidsCount: 1,
      jobsCount: 4,
      lastActivityAt: daysAgo(3),
      createdAt: daysAgo(95),
      updatedAt: daysAgo(3),
    },
    {
      id: 'seed-07',
      name: 'Ximena Reyes',
      status: 'lead',
      phone: '(925) 555-0156',
      email: 'ximena.r@outlook.com',
      notes: 'referral from Sarah Okonkwo · kitchen remodel scope',
      bidsCount: 0,
      jobsCount: 0,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
    },
    {
      id: 'seed-08',
      name: 'Tom Driscoll',
      company: 'Driscoll Hardware',
      status: 'active',
      phone: '(707) 555-0134',
      email: 'tom@driscollhw.com',
      address: '411 Main St, Petaluma CA',
      notes: 'weekly cleaning · storefront + back office',
      bidsCount: 2,
      jobsCount: 28,
      lastActivityAt: daysAgo(4),
      createdAt: daysAgo(820),
      updatedAt: daysAgo(4),
    },
    {
      id: 'seed-09',
      name: 'Marcus Bell',
      status: 'paused',
      phone: '(510) 555-0119',
      address: '77 Grand Ave, Oakland CA',
      notes: 'waiting on HOA approval · follow up next month',
      bidsCount: 1,
      jobsCount: 0,
      lastActivityAt: daysAgo(22),
      createdAt: daysAgo(40),
      updatedAt: daysAgo(22),
    },
    {
      id: 'seed-10',
      name: 'Elena Markov',
      status: 'active',
      phone: '(510) 555-0165',
      email: 'e.markov@gmail.com',
      address: '2100 Solano Ave, Albany CA',
      notes: 'landscape maintenance bi-weekly · allergic to bee stings',
      bidsCount: 1,
      jobsCount: 11,
      lastActivityAt: daysAgo(6),
      createdAt: daysAgo(340),
      updatedAt: daysAgo(6),
    },
    {
      id: 'seed-11',
      name: 'Ahmad Kassem',
      status: 'lead',
      email: 'ahmad.kassem@duck.com',
      notes: 'Instagram DM · interested in handyman package',
      bidsCount: 0,
      jobsCount: 0,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: 'seed-12',
      name: 'Beatrice Hollis',
      status: 'archived',
      phone: '(510) 555-0121',
      address: '18 Fairmount Ave, El Cerrito CA',
      notes: 'sold home March 2024 · kept on file for referrals',
      bidsCount: 4,
      jobsCount: 6,
      lastActivityAt: daysAgo(240),
      createdAt: daysAgo(900),
      updatedAt: daysAgo(240),
    },
  ]
}
