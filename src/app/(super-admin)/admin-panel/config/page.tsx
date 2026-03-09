import { getBusinessConfig } from "@/actions/business-config";
import { BusinessConfigForm } from "@/components/super-admin/business-config-form";

export default async function ConfigPage() {
  const result = await getBusinessConfig();

  if (!result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B]">Configuracion</h2>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          No se pudo cargar la configuracion del negocio. Verifica que exista un
          registro en la tabla business_config.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Configuracion</h2>
        <p className="text-sm text-[#64748B]">
          Datos del negocio y personalizacion
        </p>
      </div>
      <BusinessConfigForm config={result.data} />
    </div>
  );
}
