import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, Check, X, AlertTriangle, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parse, isValid } from "date-fns";

interface ParsedContact {
  name: string;
  phone: string;
  birth_date: string;
  isValid: boolean;
  errors: string[];
}

interface BirthdayImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess: () => void;
}

export function BirthdayImportDialog({ open, onOpenChange, campaignId, onSuccess }: BirthdayImportDialogProps) {
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDate = (dateStr: string): { date: Date | null; error: string | null } => {
    const cleanDate = dateStr.trim();
    
    // Try different date formats
    const formats = [
      "dd/MM/yyyy",
      "dd-MM-yyyy",
      "yyyy-MM-dd",
      "MM/dd/yyyy",
      "dd/MM/yy",
      "d/M/yyyy",
      "d/M/yy"
    ];

    for (const fmt of formats) {
      try {
        const parsed = parse(cleanDate, fmt, new Date());
        if (isValid(parsed)) {
          // Validate reasonable date range (1900-2020 for birth dates)
          const year = parsed.getFullYear();
          if (year >= 1900 && year <= new Date().getFullYear()) {
            return { date: parsed, error: null };
          }
        }
      } catch {
        continue;
      }
    }

    return { date: null, error: "Formato de data inválido" };
  };

  const validatePhone = (phone: string): { cleaned: string; error: string | null } => {
    const cleaned = phone.replace(/\D/g, "");
    
    if (cleaned.length < 10) {
      return { cleaned, error: "Telefone muito curto" };
    }
    
    if (cleaned.length > 13) {
      return { cleaned, error: "Telefone muito longo" };
    }

    return { cleaned, error: null };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/[\r\n]+/).filter(line => line.trim());
      
      // Detect and skip header
      const firstLine = lines[0]?.toLowerCase() || "";
      const hasHeader = firstLine.includes("nome") || firstLine.includes("name") || 
                       firstLine.includes("telefone") || firstLine.includes("phone") ||
                       firstLine.includes("data") || firstLine.includes("date") ||
                       firstLine.includes("nascimento") || firstLine.includes("birth");
      
      const startIndex = hasHeader ? 1 : 0;
      const contacts: ParsedContact[] = [];

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma or semicolon
        const parts = line.split(/[,;]/).map(p => p.trim().replace(/^["']|["']$/g, ""));
        
        const errors: string[] = [];
        
        const name = parts[0] || "";
        const phoneRaw = parts[1] || "";
        const birthDateRaw = parts[2] || "";

        if (!name) {
          errors.push("Nome vazio");
        }

        const phoneValidation = validatePhone(phoneRaw);
        if (phoneValidation.error) {
          errors.push(phoneValidation.error);
        }

        const dateValidation = parseDate(birthDateRaw);
        if (dateValidation.error) {
          errors.push(dateValidation.error);
        }

        const isValidContact = errors.length === 0;

        contacts.push({
          name,
          phone: phoneValidation.cleaned,
          birth_date: dateValidation.date ? format(dateValidation.date, "yyyy-MM-dd") : "",
          isValid: isValidContact,
          errors,
        });
      }

      setParsedContacts(contacts);
      setStep("preview");
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    const validContacts = parsedContacts.filter(c => c.isValid);
    
    if (validContacts.length === 0) {
      toast.error("Nenhum contato válido para importar");
      return;
    }

    setImporting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const contactsToInsert = validContacts.map(c => ({
        campaign_id: campaignId,
        user_id: userData.user!.id,
        name: c.name,
        phone: c.phone,
        birth_date: c.birth_date,
      }));

      const { error } = await supabase
        .from("birthday_contacts")
        .insert(contactsToInsert);

      if (error) throw error;

      toast.success(`${validContacts.length} contatos importados com sucesso!`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message);
    }
    setImporting(false);
  };

  const handleClose = () => {
    setParsedContacts([]);
    setStep("upload");
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const template = `Nome,Telefone,Data de Nascimento
João Silva,11999999999,15/03/1990
Maria Santos,21988888888,22/07/1985
Pedro Oliveira,31977777777,10/12/1992`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_aniversariantes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedContacts.filter(c => c.isValid).length;
  const invalidCount = parsedContacts.filter(c => !c.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Importar Aniversariantes via CSV</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                O arquivo CSV deve conter 3 colunas: <strong>Nome</strong>, <strong>Telefone</strong> e <strong>Data de Nascimento</strong>.
                Formatos de data aceitos: DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-medium mb-2">Arraste seu arquivo CSV aqui</h4>
              <p className="text-sm text-muted-foreground mb-4">
                ou clique para selecionar
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>

            <div className="flex justify-center">
              <Button variant="link" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Baixar modelo de planilha
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <Card className="flex-1 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{validCount}</p>
                <p className="text-xs text-muted-foreground">Válidos</p>
              </Card>
              <Card className="flex-1 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                <p className="text-xs text-muted-foreground">Inválidos</p>
              </Card>
              <Card className="flex-1 p-3 text-center">
                <p className="text-2xl font-bold">{parsedContacts.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </Card>
            </div>

            {invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {invalidCount} contato(s) com erro serão ignorados na importação.
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Nascimento</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedContacts.map((contact, idx) => (
                    <TableRow key={idx} className={contact.isValid ? "" : "bg-red-50 dark:bg-red-950/20"}>
                      <TableCell>
                        {contact.isValid ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{contact.name || "-"}</TableCell>
                      <TableCell>{contact.phone || "-"}</TableCell>
                      <TableCell>
                        {contact.birth_date 
                          ? format(new Date(contact.birth_date), "dd/MM/yyyy") 
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {contact.errors.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {contact.errors.map((err, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                {err}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <Button variant="outline" onClick={() => setStep("upload")}>
              Voltar
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {step === "preview" && validCount > 0 && (
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importar {validCount} contatos
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
