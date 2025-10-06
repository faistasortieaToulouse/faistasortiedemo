// src/app/(main)/page.tsx

import { DiscordStats } from '@/components/discord-stats';
import { DiscordWidget } from '@/components/discord-widget';
import { AiRecommendations } from '@/components/ai-recommendations';
import { DiscordChannelList } from '@/components/discord-channel-list';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { BellRing, Download, PartyPopper, Cloud, Sun, CloudRain, Calendar, Clock } from "lucide-react";
import Link from 'next/link';
import { DiscordEvents } from '@/components/discord-events';
// import { SidebarTrigger } from '@/components/ui/sidebar'; // Rendu inutile par MainLayout

import { ImageCarousel } from '@/components/image-carousel';
import Image from 'next/image'; // Ajouté l'import de Image

export const revalidate = 300; // Revalidate at most every 5 minutes

// --- Constantes (ID de Guilde et URL du Logo) ---
const GUILD_ID = '1422806103267344416';
const ftsLogoUrl = "https://firebasestorage.googleapis.com/v0/b/tolosaamicalstudio.firebasestorage.app/o/faistasortieatoulouse%2FlogofaistasortieToulouse105.png?alt=media&token=4ed06e88-d01b-403c-8cff-049c5943c0e2";
const ftsLogoUrlPurple = "https://firebasestorage.googleapis.com/v0/b/tolosaamicalstudio.firebasestorage.app/o/faistasortieatoulouse%2FlogoFTS650bas.jpg?alt=media&token=a8b14c5e-5663-4754-a2fa-149f9636909c"; // Utilisé dans le JSX

// --- Interfaces (Types de Données) ---
interface DiscordChannel {
    id: string;
    name: string;
    position: number;
    type: number;
    parent_id?: string;
}

interface DiscordEvent {
    id: string;
    name: string;
    description: string;
    scheduled_start_time: string;
    channel_id: string;
}

interface DiscordWidgetData {
    id: string;
    name: string;
    instant_invite: string | null;
    channels: DiscordChannel[];
    members: any[];
    presence_count: number;
    events: DiscordEvent[];
}

interface WeatherData {
    current: {
        time: string;
        temperature_2m: number;
        weather_code: number;
    };
    current_units: {
        temperature_2m: string;
    };
}

// --- Logique de Récupération des Données Côté Serveur (Next.js App Router) ---
export default async function DashboardPage() {
    
    // =================================================================
    // DÉCLARATIONS ET LOGIQUE DATE/MÉTÉO
    // =================================================================
    const now = new Date();
    
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Europe/Paris' 
    });
    const timeFormatter = new Intl.DateTimeFormat('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZoneName: 'short',
        timeZone: 'Europe/Paris' 
    });

    const currentDate = dateFormatter.format(now);
    const currentTime = timeFormatter.format(now);

    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=43.60&longitude=1.44&current=temperature_2m,weather_code&timezone=Europe%2FParis&forecast_days=1';
    
    let weatherData: WeatherData | null = null;
    let weatherDisplay = 'Météo indisponible 😕';
    let WeatherIcon = Cloud; 

    try {
        const res = await fetch(weatherUrl, { next: { revalidate: 3600 } }); 
        weatherData = await res.json();

        if (weatherData && weatherData.current) {
            const temp = Math.round(weatherData.current.temperature_2m);
            const unit = weatherData.current_units.temperature_2m;
            const code = weatherData.current.weather_code;
            
            weatherDisplay = `${temp}${unit} à Toulouse`;
            
            if (code >= 0 && code <= 1) {
                WeatherIcon = Sun; 
            } else if (code >= 2 && code <= 3) {
                WeatherIcon = Cloud; 
            } else if (code >= 51 && code <= 67 || code >= 80 && code <= 82) {
                WeatherIcon = CloudRain; 
            } else {
                WeatherIcon = Cloud; 
            }
        }
    } catch (e) {
        console.error('Erreur lors de la récupération de la météo:', e);
    }
    // =================================================================
    // LOGIQUE DISCORD (RÉTABLIE ET COMPLÉTÉE)
    // =================================================================
    const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN; 
    
    if (!DISCORD_TOKEN) {
        console.warn("DISCORD_BOT_TOKEN est manquant. Seules les données publiques (Widget API) seront disponibles.");
    }
    
    // 1. Récupération des salons (Channels)
    const channelsData: DiscordChannel[] = DISCORD_TOKEN ? await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
        headers: {
            Authorization: `Bot ${DISCORD_TOKEN}`, 
        },
        next: { revalidate: 300 } 
    })
    .then(async res => {
        if (!res.ok) {
            console.error(`Failed to fetch Discord channels: ${res.status} ${res.statusText}`);
            return []; 
        }
        return res.json();
    })
    .catch(err => {
        console.error('Error fetching Discord channels:', err);
        return []; 
    }) : []; 

    
    // 2. Récupération des événements (Events)
    const eventsData: DiscordEvent[] = DISCORD_TOKEN ? await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/scheduled-events`, {
        headers: {
            Authorization: `Bot ${DISCORD_TOKEN}`, 
        },
        next: { revalidate: 300 } 
    })
    .then(async res => {
        if (!res.ok) {
            console.error(`Failed to fetch Discord events: ${res.status} ${res.statusText}`);
            return [];
        }
        return res.json();
    }) 
    .catch(err => {
        console.error('Error fetching Discord events:', err);
        return [];
    }) : [];
    
    
    // 3. Récupération du Widget Public (pour les membres/statistiques)
    const widgetData: { presence_count: number; members: any[]; } = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/widget.json`, { 
        next: { revalidate: 300 } 
    })
    .then(res => res.json())
    .catch(() => ({ presence_count: 0, members: [] }));

    
    // 4. Construction de l'objet principal DiscordData
    const discordData: DiscordWidgetData = {
        id: GUILD_ID,
        name: 'Fais ta Sortie',
        instant_invite: `https://discord.gg/votre-invite`, // À remplacer
        channels: channelsData,
        members: widgetData.members,
        presence_count: widgetData.presence_count,
        events: eventsData,
    };

    // 5. Calcul des événements à venir
    const oneWeekFromNow = now.getTime() + (7 * 24 * 60 * 60 * 1000);
    
    const upcomingEventsCount = eventsData.filter(event => {
        const startTime = new Date(event.scheduled_start_time).getTime();
        return startTime >= now.getTime() && startTime <= oneWeekFromNow;
    }).length;
    // =================================================================
    // DÉBUT DU RENDU JSX
    // =================================================================

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8"> 
            
            {/* LOGO FTS - TOUT EN HAUT ET CENTRÉ */}
            <div className="flex justify-center w-full">
                <Image
                    src={ftsLogoUrlPurple}
                    alt="Logo FTS"
                    width={200} 
                    height={200}
                    className="rounded-full shadow-lg"
                />
            </div>
            
            {/* BARRE DE STATUT (DATE/HEURE/MÉTÉO) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center text-sm md:text-base">
                <div className="flex items-center justify-center p-3 bg-white rounded-xl shadow-md border border-gray-200">
                    <Calendar className="mr-2 h-5 w-5 text-purple-600" />
                    <span>{currentDate}</span>
                </div>
                <div className="flex items-center justify-center p-3 bg-white rounded-xl shadow-md border border-gray-200">
                    <Clock className="mr-2 h-5 w-5 text-purple-600" />
                    <span>{currentTime}</span>
                </div>
                <div className="flex items-center justify-center p-3 bg-white rounded-xl shadow-md border border-gray-200">
                    <WeatherIcon className="mr-2 h-5 w-5 text-purple-600" />
                    <span>{weatherDisplay}</span>
                </div>
            </div>

            {/* HEADER (TITRE, DESCRIPTION) */}
            <header className="flex flex-col gap-4">
                {/* LIGNE DU TITRE */}
                <div className="flex justify-between items-center w-full">
                    <h1 className="font-headline text-4xl font-bold text-primary">Tableau de Bord</h1>
                </div>

                {/* Descriptions (Sous le titre) */}
                <p className="mt-2 text-accent">
                    Application pour faire des sorties à Toulouse : discute des sorties, échange et organise.
                </p>
                <p className="mt-2 text-accent">
                    tout est gratuit et sans limite !
                </p>
            </header>

            {/* SECTION DU CARROUSEL : RESPONSIVE */}
            <section className="flex justify-center w-full"> 
                <div className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl mx-auto">
                    <ImageCarousel />
                </div>
            </section>
            
            <section className="flex flex-wrap justify-center items-center gap-4">
                <Button asChild size="lg">
                    <Link href={`https://discord.com/channels/${GUILD_ID}/1422806103904882842`} target="_blank" rel="noopener noreferrer">
                        Pour commencer, clique ici :
                    </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="https://discord.com/download" target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-5 w-5" />
                        Télécharger Discord
                    </Link>
                </Button>
            </section>

            <section className="flex flex-wrap justify-center gap-4">
                <Button size="lg" variant="outline" disabled>
                    <PartyPopper className="mr-2 h-5 w-5" />
                    Girls Party
                </Button>
                <Button size="lg" variant="outline" disabled>
                    <PartyPopper className="mr-2 h-5 w-5" />
                    Student Event
                </Button>
            </section>

            <section>
                <DiscordStats data={discordData} />
            </section>
            
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col gap-8">
                    <AiRecommendations eventData={discordData?.events ? JSON.stringify(discordData.events, null, 2) : 'No event data available.'} />
                    <DiscordWidget />
                    <DiscordChannelList channels={discordData?.channels} />
                </div>
                <div className="flex flex-col gap-8">
                    <DiscordEvents events={discordData?.events} />
                </div>
            </section>

            <section>
                <Alert>
                    <BellRing className="h-4 w-4" />
                    <AlertTitle>Événements à Venir (7 Jours)</AlertTitle>
                    <AlertDescription>
                        {upcomingEventsCount > 0 ? (
                            <p className="font-bold text-lg text-primary">
                                Il y a actuellement **{upcomingEventsCount}** événements prévus cette semaine !
                            </p>
                        ) : (
                            'Aucun événement n’est prévu cette semaine. Consultez la liste ci-dessous pour organiser une sortie !'
                        )}
                    </AlertDescription>
                </Alert>
            </section>
        </div>
    );
}
