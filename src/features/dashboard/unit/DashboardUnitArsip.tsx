import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderOpen, FileText, Trash2, Link as LinkIcon, ExternalLink } from "lucide-react";

type ArchiveCategory = {
  id: string;
  name: string;
};

type ArchiveDocument = {
  id: string;
  category_id: string;
  title: string;
  drive_link: string;
};

export function DashboardUnitArsip() {
  const { activeRole } = useAuth();
  const lembagaId = activeRole?.lembaga_id;
  
  const [categories, setCategories] = useState<ArchiveCategory[]>([]);
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocLink, setNewDocLink] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lembagaId) {
      fetchCategories();
    }
  }, [lembagaId]);

  useEffect(() => {
    if (activeCategoryId) {
      fetchDocuments(activeCategoryId);
    } else {
      setDocuments([]);
    }
  }, [activeCategoryId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("archive_categories")
      .select("*")
      .eq("lembaga_id", lembagaId)
      .order("created_at", { ascending: true });
      
    if (!error && data) {
      setCategories(data);
      if (data.length > 0 && !activeCategoryId) {
        setActiveCategoryId(data[0].id);
      }
    }
  };

  const fetchDocuments = async (categoryId: string) => {
    const { data, error } = await supabase
      .from("archive_documents")
      .select("*")
      .eq("category_id", categoryId)
      .order("created_at", { ascending: false });
      
    if (!error && data) {
      setDocuments(data);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("archive_categories")
      .insert([{ name: newCategoryName, lembaga_id: lembagaId }])
      .select();
      
    if (!error && data) {
      setCategories([...categories, data[0]]);
      setActiveCategoryId(data[0].id);
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kategori ini beserta semua dokumennya?")) return;
    await supabase.from("archive_categories").delete().eq("id", id);
    setCategories(categories.filter(c => c.id !== id));
    if (activeCategoryId === id) {
      setActiveCategoryId(categories.length > 1 ? categories[0].id : null);
    }
  };

  const handleAddDocument = async () => {
    if (!newDocTitle.trim() || !newDocLink.trim() || !activeCategoryId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("archive_documents")
      .insert([{ 
        category_id: activeCategoryId, 
        title: newDocTitle, 
        drive_link: newDocLink 
      }])
      .select();
      
    if (!error && data) {
      setDocuments([data[0], ...documents]);
      setNewDocTitle("");
      setNewDocLink("");
      setIsAddingDocument(false);
    }
    setLoading(false);
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Yakin ingin menghapus dokumen ini?")) return;
    await supabase.from("archive_documents").delete().eq("id", id);
    setDocuments(documents.filter(d => d.id !== id));
  };

  // Convert Google Drive link to embeddable preview link
  const getEmbedLink = (url: string) => {
    if (!url) return "";
    try {
      // Handle standard drive.google.com/file/d/ID/view format
      const match = url.match(/(.+?\/file\/d\/[a-zA-Z0-9_-]+)\/(view|edit).*/);
      if (match) {
        return `${match[1]}/preview`;
      }
      return url;
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Arsip Dokumen</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola dan lihat dokumen arsip via Google Drive</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Categories Tabs Header */}
        <div className="border-b border-gray-100 bg-gray-50/50 p-2 flex gap-2 overflow-x-auto no-scrollbar items-center">
          {categories.map((cat) => (
            <div key={cat.id} className="flex group">
              <button
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeCategoryId === cat.id
                    ? "bg-white text-emerald-700 shadow-sm border border-gray-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                {cat.name}
              </button>
              {activeCategoryId === cat.id && (
                <button 
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="ml-1 p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Hapus Kategori"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {isAddingCategory ? (
            <div className="flex items-center gap-2 ml-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nama Kategori (mis. Ijazah 2025)"
                className="w-48 h-9 text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleAddCategory} disabled={loading} className="h-9">Simpan</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingCategory(false)} className="h-9 text-gray-500">Batal</Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingCategory(true)}
              className="ml-2 h-9 border-dashed text-gray-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1" /> Kategori Baru
            </Button>
          )}
        </div>

        {/* Documents Area */}
        <div className="p-6">
          {!activeCategoryId ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Belum ada kategori arsip. Silakan buat kategori baru terlebih dahulu.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg text-gray-800">
                  Dokumen: {categories.find(c => c.id === activeCategoryId)?.name}
                </h3>
                
                {!isAddingDocument && (
                  <Button onClick={() => setIsAddingDocument(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" /> Tambah Dokumen
                  </Button>
                )}
              </div>

              {isAddingDocument && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Nama Dokumen</label>
                    <Input
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Contoh: Ijazah Budi Santoso"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Link Google Drive</label>
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        value={newDocLink}
                        onChange={(e) => setNewDocLink(e.target.value)}
                        placeholder="https://drive.google.com/file/d/..."
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={handleAddDocument} disabled={loading} className="w-full sm:w-auto">Simpan</Button>
                    <Button variant="ghost" onClick={() => setIsAddingDocument(false)} className="w-full sm:w-auto">Batal</Button>
                  </div>
                </div>
              )}

              {documents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada dokumen di kategori ini.</p>
                  <Button variant="link" onClick={() => setIsAddingDocument(true)} className="text-emerald-600">
                    Tambah dokumen pertama
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-[500px]">
                      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <h4 className="font-semibold text-sm text-gray-800 truncate" title={doc.title}>
                            {doc.title}
                          </h4>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <a 
                            href={doc.drive_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Buka di tab baru"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button 
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 bg-gray-100 relative">
                        {doc.drive_link ? (
                          <iframe 
                            src={getEmbedLink(doc.drive_link)}
                            className="w-full h-full border-0 absolute inset-0"
                            title={doc.title}
                            allow="autoplay"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            Link tidak valid
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
