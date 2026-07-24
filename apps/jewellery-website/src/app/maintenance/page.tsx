import type { SettingsResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';

export default async function MaintenancePage() {
  const settings = await apiGet<SettingsResponse>('/settings', 0).catch(
    (): SettingsResponse => ({
      silverRatePerKg: 0,
      goldRatePer10g: 0,
      charges: [],
      maintenance: { enabled: true, message: '' },
    }),
  );
  const { message, endAt } = settings.maintenance;

  return (
    <main className="container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-3xl">We&apos;ll be back shortly</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        {message || "Lorka Jewellers is undergoing scheduled maintenance. Please check back soon."}
      </p>
      {endAt && (
        <p className="mt-6 text-sm text-muted-foreground">
          Expected back by {new Date(endAt).toLocaleString()}
        </p>
      )}
    </main>
  );
}
