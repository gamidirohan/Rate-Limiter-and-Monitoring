"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { useSettings } from '@/lib/api/hooks'

export function CreateKeyDialog({ onCreateKey, isCreating = false }) {
  const [open, setOpen] = useState(false)
  const { data: settings } = useSettings()
  const tiers = settings?.tiers || []
  
  const [formData, setFormData] = useState({
    name: '',
    ownerEmail: '',
    tier: tiers.length > 0 ? tiers[0].id : 'basic',
  })

  // Update default tier when tiers load
  useEffect(() => {
    if (tiers.length > 0 && !formData.tier) {
      setFormData(prev => ({ ...prev, tier: tiers[0].id }))
    }
  }, [tiers, formData.tier])

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Remove empty ownerEmail to let backend use default
    const submitData = {
      ...formData,
      ...(formData.ownerEmail && { ownerEmail: formData.ownerEmail })
    }
    await onCreateKey(submitData)
    setOpen(false)
    // Reset form
    setFormData({
      name: '',
      ownerEmail: '',
      tier: tiers.length > 0 ? tiers[0].id : 'basic',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key with custom rate limits. The key will be shown once and cannot be retrieved later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Key Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="My Project"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ownerEmail">Owner Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="owner@example.com"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Defaults to admin@example.com if not provided
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tier">
                Tier <span className="text-destructive">*</span>
              </Label>
              <select
                id="tier"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                required
              >
                {tiers.length === 0 ? (
                  <option value="basic">Basic (loading...)</option>
                ) : (
                  tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} ({tier.rateLimit} req/s, {tier.rateLimit * 60} req/min)
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-muted-foreground">
                Rate limits are automatically configured based on tier
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Key'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
