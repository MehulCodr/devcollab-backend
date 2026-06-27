"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/ui/Card";
import Tabs from "@/components/ui/Tabs";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { FolderKanban, Star, Archive, Users, Clock, Plus } from "lucide-react";
import Link from "next/link";

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const mockProjects = [
    {
      id: "proj_1",
      name: "Q3 Marketing Site",
      description: "Redesign of the main marketing website with new branding and SEO optimizations.",
      organization: "Acme Corp",
      status: "in_progress",
      owner: "Sarah Jenkins",
      memberCount: 8,
      updatedAt: "2 hours ago",
      pinned: true,
      archived: false,
    },
    {
      id: "proj_2",
      name: "Authentication API v2",
      description: "Migration to the new OAuth provider and adding MFA support.",
      organization: "DevCollab Team",
      status: "review",
      owner: "You",
      memberCount: 3,
      updatedAt: "1 day ago",
      pinned: true,
      archived: false,
    },
    {
      id: "proj_3",
      name: "Mobile App Beta",
      description: "Internal beta testing for the new React Native mobile application.",
      organization: "Acme Corp",
      status: "planning",
      owner: "Marcus Doe",
      memberCount: 5,
      updatedAt: "3 days ago",
      pinned: false,
      archived: false,
    },
    {
      id: "proj_4",
      name: "Legacy Data Migration",
      description: "Moving old customer records to the new database schema.",
      organization: "DevCollab Team",
      status: "completed",
      owner: "You",
      memberCount: 2,
      updatedAt: "2 weeks ago",
      pinned: false,
      archived: true,
    }
  ];

  const tabs = [
    { id: "all", label: "All Projects", icon: FolderKanban, count: mockProjects.filter(p => !p.archived).length },
    { id: "pinned", label: "Pinned", icon: Star, count: mockProjects.filter(p => p.pinned && !p.archived).length },
    { id: "archived", label: "Archived", icon: Archive, count: mockProjects.filter(p => p.archived).length }
  ];

  const filteredProjects = mockProjects.filter(project => {
    if (activeTab === "pinned") return project.pinned && !project.archived;
    if (activeTab === "archived") return project.archived;
    return !project.archived;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress': return 'blue';
      case 'review': return 'amber';
      case 'planning': return 'purple';
      case 'completed': return 'green';
      default: return 'slate';
    }
  };

  const getStatusLabel = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <AppShell
      title="Projects"
      description="Manage and track all your projects across organizations."
      actions={
        <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      }
    >
      <div className="mb-6">
        <Tabs tabs={tabs} defaultTab={activeTab} onChange={setActiveTab} />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="mt-8">
          <EmptyState message={`No ${activeTab === 'all' ? '' : activeTab} projects found.`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="group hover:border-blue-500/50 transition-colors flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-500">{project.organization}</p>
                  </div>
                </div>
                {project.pinned && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
              </div>
              
              <p className="text-sm text-slate-400 mb-6 flex-1 line-clamp-2">
                {project.description}
              </p>
              
              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusColor(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                  
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{project.memberCount} members</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Owner:</span> {project.owner}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {project.updatedAt}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
