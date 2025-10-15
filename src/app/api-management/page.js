"use client"

import { useState } from 'react'
import { Search, MoreHorizontal, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useKeys, useCreateKey, useDisableKey } from '@/lib/api/hooks'
import { CreateKeyDialog } from '@/components/CreateKeyDialog'
import { ShowKeyDialog } from '@/components/ShowKeyDialog'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatDate } from '@/lib/utils'

export default function ApiManagement() {
  const [searchQuery, setSearchQuery] = useState('')
  const [newApiKey, setNewApiKey] = useState(null)
  const [showKeyDialog, setShowKeyDialog] = useState(false)

  // Fetch API keys
  const { data: keysResponse, isLoading, error } = useKeys()
  const createKeyMutation = useCreateKey()
  const deleteKeyMutation = useDisableKey() // Note: this actually deletes now

  const apiKeys = keysResponse?.data || []

  // Handle create key
  const handleCreateKey = async (keyData) => {
    try {
      const result = await createKeyMutation.mutateAsync(keyData)
      if (result.data?.apiKey) {
        setNewApiKey(result.data.apiKey)
        setShowKeyDialog(true)
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
      alert('Failed to create API key. Please try again.')
    }
  }

  // Handle delete key
  const handleDeleteKey = async (keyId) => {
    if (!confirm('Are you sure you want to permanently delete this API key? This action cannot be undone.')) return
    
    try {
      await deleteKeyMutation.mutateAsync(keyId)
    } catch (error) {
      console.error('Failed to delete key:', error)
      alert('Failed to delete key. Please try again.')
    }
  }

  // Filter API keys based on search query
  const filteredKeys = apiKeys.filter(
    (key) =>
      key.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.api_key_hash?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <p className="text-muted-foreground">Failed to load API keys</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys and their rate limits.
          </p>
        </div>

        {/* Search and New API Key Button */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search API Keys"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <CreateKeyDialog 
            onCreateKey={handleCreateKey}
            isCreating={createKeyMutation.isPending}
          />
        </div>

        {/* Show new API key dialog */}
        {newApiKey && (
          <ShowKeyDialog
            apiKey={newApiKey}
            open={showKeyDialog}
            onClose={() => {
              setShowKeyDialog(false)
              setNewApiKey(null)
            }}
          />
        )}

        {/* API Keys Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NAME</TableHead>
                <TableHead>KEY</TableHead>
                <TableHead>LIMITS</TableHead>
                <TableHead>MINUTE USAGE</TableHead>
                <TableHead>DAILY USAGE</TableHead>
                <TableHead className="text-center">ERRORS</TableHead>
                <TableHead>LAST SEEN</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeys.length > 0 ? (
                filteredKeys.map((key) => {
                  // Backend returns usage as percentages already
                  const minutePercent = key.usage?.minute || 0
                  const dailyPercent = key.usage?.day || 0
                  const errors429 = key.errors429 || 0
                  const perMinute = key.limits?.perMinute || key.perMinute
                  const perDay = key.limits?.perDay || key.perDay
                  
                  return (
                    <TableRow key={key.id} className={key.disabled ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">
                        {key.name}
                        {key.disabled && (
                          <span className="ml-2 text-xs text-destructive">(Disabled)</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {key.maskedKey}
                      </TableCell>
                      <TableCell>
                        {perMinute}/min, {perDay}/day
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[120px]">
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  minutePercent > 90 ? 'bg-destructive' : 
                                  minutePercent > 75 ? 'bg-yellow-500' : 
                                  'bg-primary'
                                }`}
                                style={{
                                  width: `${Math.min(minutePercent, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground min-w-[48px]">
                            {minutePercent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[120px]">
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  dailyPercent > 90 ? 'bg-destructive' : 
                                  dailyPercent > 75 ? 'bg-yellow-500' : 
                                  'bg-primary'
                                }`}
                                style={{
                                  width: `${Math.min(dailyPercent, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground min-w-[48px]">
                            {dailyPercent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            errors429 > 0
                              ? 'text-destructive font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {errors429}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.lastSeen ? formatDate(key.lastSeen) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="More options"
                          onClick={() => handleDeleteKey(key.id)}
                          disabled={deleteKeyMutation.isPending}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {searchQuery ? 'No API keys match your search.' : 'No API keys found. Create one to get started.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination info */}
        {filteredKeys.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing 1 to {filteredKeys.length} of {apiKeys.length} results
          </div>
        )}
      </div>
    </div>
  )
}
