import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    name: string | null;
    phone: string;
  } | null;
  onUpdated: (updates: { name: string }) => void;
}

export const EditContactDialog = ({ open, onOpenChange, contact, onUpdated }: EditContactDialogProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  // Load lead data if exists
  useEffect(() => {
    if (contact && open) {
      setName(contact.name || "");
      setPhone(contact.phone || "");
      // Try to load from leads table
      loadLeadData(contact.phone);
    }
  }, [contact, open]);

  const loadLeadData = async (phone: string) => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    
    if (data) {
      setEmail(data.email || "");
      setNotes(data.notes || "");
      setTags(data.tags || []);
      const cf = data.custom_fields as any || {};
      setCpf(cf.cpf || "");
      setAddress(cf.address || "");
      setCity(cf.city || "");
      setState(cf.state || "");
      setZipCode(cf.zip_code || "");
      setBirthDate(cf.birth_date || "");
    } else {
      setEmail("");
      setNotes("");
      setTags([]);
      setCpf("");
      setAddress("");
      setCity("");
      setState("");
      setZipCode("");
      setBirthDate("");
    }
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!contact) return;
    
    setSaving(true);
    try {
      const customFields = {
        cpf, address, city, state, zip_code: zipCode, birth_date: birthDate
      };

      // Upsert into leads table
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("phone", contact.phone)
        .maybeSingle();

      if (existingLead) {
        await supabase
          .from("leads")
          .update({
            name: name || contact.name || "Sem nome",
            email: email || null,
            notes: notes || null,
            tags,
            custom_fields: customFields,
          })
          .eq("id", existingLead.id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("leads").insert({
            name: name || contact.name || "Sem nome",
            phone: contact.phone,
            email: email || null,
            notes: notes || null,
            tags,
            custom_fields: customFields,
            user_id: user.id,
            source: "chat",
          });
        }
      }

      // Update conversation contact_name
      onUpdated({ name: name || contact.name || "" });
      
      toast.success("Contato atualizado!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar contato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                disabled
                className="opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input
                id="zipCode"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="00000-000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, complemento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="UF"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-2 py-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre o contato..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};