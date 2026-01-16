'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Linkedin, Youtube, Facebook, MoreHorizontal, Copy, Trash2, Settings, Loader2, Pencil } from 'lucide-react'
import type { Project, Platform, ProjectStatus, CreateProjectRequest } from '@/types'
import { ProjectForm } from '@/components/modals/ProjectForm'

const PLATFORM_ICONS = {
  linkedin: Linkedin,
  youtube: Youtube,
  facebook: Facebook,
}

const PLATFORM_COLORS = {
  linkedin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  youtube: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  facebook: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
}

const STATUS_BADGES = {
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  published: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

export default function Home() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [platformFilter, setPlatformFilter] = useState<Platform | ''>('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [statusFilter, platformFilter])

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (platformFilter) params.append('platform', platformFilter)

      const response = await fetch(`/api/projects?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch projects')
      const data = await response.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete project')
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
    setOpenMenu(null)
  }

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to duplicate project')
      const newProject = await response.json()
      setProjects(prev => [newProject, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate')
    }
    setOpenMenu(null)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setOpenMenu(null)
  }

  const handleEditSubmit = async (data: CreateProjectRequest) => {
    if (!editingProject) return

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update project')
      const updatedProject = await response.json()
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))
      setEditingProject(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    }
  }

  const filteredProjects = projects.filter(project => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        project.name.toLowerCase().includes(query) ||
        project.topic.toLowerCase().includes(query) ||
        project.target_audience.toLowerCase().includes(query)
      )
    }
    return true
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Content Creator
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/settings')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/project/new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="published">Published</option>
          </select>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as Platform | '')}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Platforms</option>
            <option value="linkedin">LinkedIn</option>
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery || statusFilter || platformFilter ? 'No matching projects' : 'No projects yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || statusFilter || platformFilter
                ? 'Try adjusting your filters'
                : 'Create your first content project to get started'}
            </p>
            {!searchQuery && !statusFilter && !platformFilter && (
              <button
                onClick={() => router.push('/project/new')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const PlatformIcon = PLATFORM_ICONS[project.platform]

              return (
                <div
                  key={project.id}
                  className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${PLATFORM_COLORS[project.platform]}`}>
                        <PlatformIcon className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGES[project.status]}`}>
                          {project.status.replace('_', ' ')}
                        </span>

                        {/* Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenu(openMenu === project.id ? null : project.id)
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenu === project.id && (
                            <div className="absolute right-0 top-8 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(project)
                                }}
                                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Pencil className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDuplicate(project.id)
                                }}
                                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(project.id)
                                }}
                                className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {project.topic}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Created {formatDate(project.created_at)}</span>
                    {project.target_audience && (
                      <span className="truncate max-w-[150px]" title={project.target_audience}>
                        {project.target_audience}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Click outside to close menu */}
      {openMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenMenu(null)}
        />
      )}

      {/* Edit Project Modal */}
      <ProjectForm
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSubmit={handleEditSubmit}
        initialData={editingProject ? {
          name: editingProject.name,
          topic: editingProject.topic,
          target_audience: editingProject.target_audience,
          content_style: editingProject.content_style,
          platform: editingProject.platform,
        } : undefined}
        title="Edit Project"
        submitLabel="Save Changes"
      />
    </div>
  )
}
