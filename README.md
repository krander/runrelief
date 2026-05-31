# runrelief
RunRelief — Find public bathrooms near you while running

## Project Structure

```
runrelief/
├── assets/          # Images, icons, and fonts (splash, app icon, etc.)
├── components/      # Reusable UI components (cards, buttons, badges, etc.)
├── hooks/           # Custom React hooks (useLocation, useBathrooms, etc.)
├── lib/             # Utility files and third-party client setup
│                    #   supabase.ts  — Supabase client initialisation
│                    #   overpass.ts  — OpenStreetMap Overpass API helpers
│                    #   utils.ts     — Shared utility functions
│                    #   theme.ts     — Colours, typography, spacing constants
└── screens/         # Full-screen route components
                     #   FinderScreen — Map view for finding nearby bathrooms
                     #   AddScreen    — Form to submit a new bathroom location
                     #   ProfileScreen — User profile and saved locations
```
