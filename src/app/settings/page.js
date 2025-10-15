"use client"

import { useState, useEffect } from 'react'
import { Plus, Pencil, AlertCircle, Save } from 'lucide-react'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose, 
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSettings, useUpdateSettings } from '@/lib/api/hooks'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Settings() {
  const { data: settings, isLoading, error } = useSettings()
  const updateSettingsMutation = useUpdateSettings()
  
  const [defaultRateLimit, setDefaultRateLimit] = useState('')
  const [defaultBurstLimit, setDefaultBurstLimit] = useState('')
  const [tiers, setTiers] = useState([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize state when data loads
  useEffect(() => {
    if (settings) {
      setDefaultRateLimit(settings.defaultRateLimit?.toString() || '')
      setDefaultBurstLimit(settings.defaultBurstLimit?.toString() || '')
      setTiers(settings.tiers || [])
    }
  }, [settings])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTier, setEditingTier] = useState(null)
  const [addingTier, setAddingTier] = useState(false)

  const handleSaveAll = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        defaultRateLimit: parseInt(defaultRateLimit),
        defaultBurstLimit: parseInt(defaultBurstLimit),
        tiers: tiers,
      })
      setHasChanges(false)
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  const handleEditTier = (tierId) => {
    const t = tiers.find((x) => x.id === tierId)
    if (t) {
      setEditingTier({ ...t })
      setAddingTier(false)
      setDrawerOpen(true)
    }
  }

  const handleAddTier = () => {
    setEditingTier({
      id: `tier_${Date.now()}`,
      name: '',
      rateLimit: 50,
      burstLimit: 100,
    })
    setAddingTier(true)
    setDrawerOpen(true)
  }

  const handleSaveTier = () => {
    if (!editingTier) return
    
    if (addingTier) {
      setTiers((prev) => [...prev, editingTier])
    } else {
      setTiers((prev) => prev.map((t) => (t.id === editingTier.id ? editingTier : t)))
    }
    
    setHasChanges(true)
    setDrawerOpen(false)
    setEditingTier(null)
    setAddingTier(false)
  }

  const handleDeleteTier = (tierId) => {
    if (!confirm('Are you sure you want to delete this tier?')) return
    setTiers((prev) => prev.filter((t) => t.id !== tierId))
    setHasChanges(true)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-muted-foreground">Failed to load settings</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Save Button */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage global default settings for the rate limiter, including tier configurations.
            </p>
          </div>
          {hasChanges && (
            <Button 
              onClick={handleSaveAll} 
              disabled={updateSettingsMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save All Changes'}
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Global Rate Limiter Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Global Rate Limiter Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="rateLimit" className="text-sm font-medium">
                    Default Rate Limit (requests/second)
                  </label>
                  <Input
                    id="rateLimit"
                    type="number"
                    min="1"
                    value={defaultRateLimit}
                    onChange={(e) => {
                      setDefaultRateLimit(e.target.value)
                      setHasChanges(true)
                    }}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Applied to new API keys by default
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="burstLimit" className="text-sm font-medium">
                    Default Burst Limit (requests)
                  </label>
                  <Input
                    id="burstLimit"
                    type="number"
                    min="1"
                    value={defaultBurstLimit}
                    onChange={(e) => {
                      setDefaultBurstLimit(e.target.value)
                      setHasChanges(true)
                    }}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum burst capacity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tier Configurations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Tier Configurations</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Define rate limit tiers for different API key types
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={handleAddTier}>
                <Plus className="h-4 w-4" />
                Add New Tier
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>TIER NAME</TableHead>
                      <TableHead>RATE LIMIT (REQ/S)</TableHead>
                      <TableHead>BURST LIMIT (REQ)</TableHead>
                      <TableHead>PER MINUTE</TableHead>
                      <TableHead>PER DAY</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No tiers configured. Click &quot;Add New Tier&quot; to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tiers.map((tier) => (
                        <TableRow key={tier.id}>
                          <TableCell className="font-medium">{tier.name}</TableCell>
                          <TableCell>{tier.rateLimit}</TableCell>
                          <TableCell>{tier.burstLimit}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {tier.rateLimit * 60}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {tier.rateLimit * 60 * 60 * 24}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => handleEditTier(tier.id)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit/Add Tier Drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent side="right">
            <DrawerHeader>
              <DrawerTitle>{addingTier ? 'Add New Tier' : 'Edit Tier'}</DrawerTitle>
              <DrawerDescription>
                {addingTier 
                  ? 'Create a new tier with custom rate limits.' 
                  : 'Update tier name, rate limit and burst limit.'}
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-4 p-4">
              <div>
                <label className="text-sm font-medium">Tier Name</label>
                <Input
                  value={editingTier?.name ?? ''}
                  onChange={(e) =>
                    setEditingTier((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Premium, Enterprise"
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rate Limit (requests/second)</label>
                <Input
                  type="number"
                  min="1"
                  value={editingTier?.rateLimit ?? ''}
                  onChange={(e) =>
                    setEditingTier((prev) => ({ ...prev, rateLimit: Number(e.target.value) }))
                  }
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Per-minute: {editingTier?.rateLimit ? editingTier.rateLimit * 60 : 0} | 
                  Per-day: {editingTier?.rateLimit ? editingTier.rateLimit * 60 * 60 * 24 : 0}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Burst Limit (requests)</label>
                <Input
                  type="number"
                  min="1"
                  value={editingTier?.burstLimit ?? ''}
                  onChange={(e) =>
                    setEditingTier((prev) => ({ ...prev, burstLimit: Number(e.target.value) }))
                  }
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of requests allowed in a burst
                </p>
              </div>
            </div>

            <DrawerFooter>
              <div className="flex gap-2 w-full">
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1">Cancel</Button>
                </DrawerClose>
                <Button onClick={handleSaveTier} className="flex-1">
                  {addingTier ? 'Add Tier' : 'Save Changes'}
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}
