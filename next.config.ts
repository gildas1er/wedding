import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Liens RSVP déjà envoyés par WhatsApp : la page publique a quitté l'espace des mariés
      { source: "/dashboard/rsvp/:id", destination: "/rsvp/:id", permanent: true },
      // Anciennes pages en double
      { source: "/dashboard/guests", destination: "/dashboard/invite", permanent: true },
      { source: "/dashboard/tables", destination: "/dashboard/table", permanent: true },
      { source: "/dashboard/invitation", destination: "/dashboard/studio", permanent: true },
      // Anciens liens des documents juridiques
      { source: "/terms", destination: "/conditions", permanent: true },
      { source: "/privacy", destination: "/confidentialite", permanent: true },
    ];
  },
};

export default nextConfig;
