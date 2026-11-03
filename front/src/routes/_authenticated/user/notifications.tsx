import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import DashboardLayout from '../../../components/dashboard.layout.tsx'
import { NotificationPrefs } from '../../../components/settings/notificationPrefs.tsx'
import { Button } from '../../../components/ui/button.tsx'

export const Route = createFileRoute('/_authenticated/user/notifications')({
  component: UserNotifications,
})

function UserNotifications() {
  const navigate = useNavigate()

  return (
    <DashboardLayout>
      <div className="flex-1 bg-background p-6 rounded-lg flex flex-col w-full gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate({ to: '/' })}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-text-foreground text-xl font-semibold">
            Notifications
          </h2>
        </div>
        <div className="mt-4">
          <NotificationPrefs />
        </div>
      </div>
    </DashboardLayout>
  )
}

export default UserNotifications
