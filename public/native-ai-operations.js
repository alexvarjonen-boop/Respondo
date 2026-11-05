(() => {
  'use strict';
  const API='/api/app/native';
  const copy={
    fi:{tasks:'Työtehtävät',tasksIntro:'Respondon omat muistutukset ja jatkotoimet. Liidit ja asiakaspyynnöt voivat luoda tehtävän automaattisesti ilman ulkoisia palveluja.',tasksOpen:'Avoimet',tasksOverdue:'Myöhässä',tasksCompleted:'Valmiit',tasksDue:'Määräaika',tasksTitle:'Tehtävän otsikko',tasksDetails:'Tarkemmat tiedot',tasksCreate:'Luo oma tehtävä',tasksDone:'Merkitse tehdyksi',tasksReopen:'Avaa uudelleen',tasksEmpty:'Ei työtehtäviä.',tasksNoNotifications:'Muistutukset näkyvät vain Respondossa. Ulkoisia sähköposti- tai tekstiviesti-ilmoituksia ei lähetetä.',tasksUrgent:'Kiireellinen',tasksNormal:'Normaali',tasksLate:'Myöhässä',calendar:'Oma kalenteri',calendarIntro:'Respondon oma ajanvaraus ilman Googlea tai muuta ulkoista kalenteria. Vahvista työvaraus vasta tarkistettuasi työn keston ja asiakkaan tiedot.',calendarStart:'Alkamisaika',calendarEnd:'Päättymisaika',calendarAddSlot:'Lisää vapaa aika',calendarAvailable:'Vapaat ajat',calendarPending:'Vahvistusta odottavat varauspyynnöt',calendarConfirmed:'Varaukset',calendarConfirm:'Vahvista varaus',calendarReject:'Hylkää pyyntö',calendarCancel:'Peru varaus',calendarNote:'Päätöksen lisätiedot',calendarDuration:'Arvioitu työn kesto',calendarMinutes:'minuuttia',calendarNoSlots:'Ei vapaita aikoja.',calendarNoRequests:'Ei avoimia varauspyyntöjä.',calendarNoEvents:'Ei vielä varauksia.',calendarExternalWarning:'Varaukset tallennetaan vain Respondoon. Ulkoisia kalentereita ei päivitetä eikä asiakkaalle lähetetä automaattisesti vahvistusviestiä.',calendarConfirmPrompt:'Oletko tarkistanut työn keston, henkilökunnan saatavuuden sekä asiakkaan tiedot ja haluatko varata ajan?',calendarRejectPrompt:'Hylätäänkö tämä alustava varauspyyntö?',calendarCancelPrompt:'Perutaanko tämä sisäinen varaus? Asiakkaalle ei lähde automaattista ilmoitusta.',calendarInvalidDates:'Tarkista ajan alku ja loppu.',calendarNotifyManually:'Ilmoita vahvistus tai peruutus asiakkaalle erikseen.',calendarStatusBooked:'Varattu',calendarStatusOpen:'Vapaa',calendarStatusCancelled:'Peruttu',inbox:'Viestikeskus',inboxIntro:'Respondon omat verkkosivukeskustelut ja rajapintakanavien keskusteluhistoria. Verkkosivuchattiin voidaan vastata suoraan; muihin kanaviin tallennetaan vain luonnos.',inboxEmpty:'Ei keskusteluja.',inboxOpen:'Avaa keskustelu',inboxBack:'Palaa keskusteluihin',inboxReply:'Vastaa verkkosivuchattiin',inboxMailReply:'Lähetä hyväksytty sähköpostivastaus',inboxMetaReply:'Lähetä hyväksytty kanavavastaus',inboxMetaConfirm:'Vahvistatko tämän viestin lähettämisen asiakkaalle ulkoiseen viestikanavaan? Tarkista sisältö ja vastaanottaja.',inboxMetaSent:'Kanavavastaus lähetetty.',inboxMetaUnknown:'Lähetyksen tila on epävarma. Tarkista ulkoisesta kanavasta ennen uutta lähetystä.',inboxMailConfirm:'Hyväksytkö tämän viestin lähettämisen asiakkaan sähköpostiin? Tarkista sisältö, vastaanottaja ja mahdolliset varauslupaukset.',inboxMailSent:'Sähköposti lähetetty.',inboxMailUnknown:'Lähetyksen tila on epävarma. Tarkista lähettäjän sähköpostista ennen uutta yritystä.',inboxSaveDraft:'Tallenna luonnos',inboxNewNote:'Yksityinen muistiinpano',inboxNoteSave:'Lisää muistiinpano',inboxSuggestion:'Etsi lähdepohjainen ehdotus',inboxUseSuggestion:'Käytä ehdotusta luonnoksena',inboxNoSuggestion:'Ei riittävän varmaa lähde-ehdotusta.',inboxSuggestionWarning:'Tarkista lähteen ajantasaisuus, kieli ja soveltuvuus ennen lähettämistä.',inboxDraft:'Vastausluonnos',inboxExternalOnly:'Ulkoiselle kanavalle ei ole kytketty lähettämistä. Tämä viesti jää vain Respondon luonnokseksi.',inboxMarkClosed:'Merkitse käsitellyksi',inboxReopen:'Avaa uudelleen',inboxNoMessages:'Ei viestejä.',inboxNotes:'Sisäiset muistiinpanot',inboxSent:'Vastaus tallennettu verkkosivuchattiin.',inboxNoDelivery:'Ei lähetetty ulkoisiin palveluihin.',inboxMessage:'Kirjoita vastaus',inboxStatusOpen:'Avoin',inboxStatusClosed:'Suljettu',repairTitle:'Korjausehdotukset',repairIntro:'Ehdotukset perustuvat vain tämän yrityksen nykyisiin hyväksyttyihin tietoihin. Tarkista lähde ja vahvista yleispätevä kysymys ennen hyväksyntää.',repairApprove:'Hyväksy lähteeseen sidottu korjaus',repairQuestion:'Yleinen asiakaskysymys (ei henkilötietoja)',repairSource:'Ehdotettu lähde',repairNoCandidates:'Ei todennettavia korjausehdotuksia.',repairNote:'Vastaus haetaan aina alkuperäisestä hyväksytystä lähteestä. Lähteen poistuessa korjausta ei enää käytetä.',repairApproved:'Hyväksytyt korjaukset',repairConfirm:'Tarkistin lähteen oikeellisuuden. Hyväksyn tämän kysymyksen yhdistämisen lähteeseen.',repairQuality:'Ehdotus, ei varmennettu vastaus',zendesk:'Zendesk OAuth',zendeskIntro:'Yhdistä yrityksesi Zendesk-tili OAuth-valtuutuksella. Tukipyynnöt siirtyvät vain omalla hyväksynnälläsi.',zendeskNotConfigured:'Zendesk OAuth -sovellustunnuksia ei ole vielä asetettu. Ota yhteyttä Respondo-ylläpitoon.',zendeskDomain:'Zendesk-aliverkkotunnus',zendeskAuthorize:'Valtuuta Zendesk',zendeskScope:'Pyydettävät käyttöoikeudet: tickets:read ja tickets:write.',zendeskConnected:'Zendesk yhdistetty',zendeskDisconnected:'Zendesk ei yhdistetty',zendeskStartError:'Valtuutuslinkin luonti epäonnistui.',zendeskDisconnect:'Katkaise Zendesk-yhteys',zendeskDisconnectConfirm:'Poistetaanko Zendesk-valtuutus? Aiemmat vientitiedot säilyvät.',zendeskExportConsent:'Hyväksyn tämän asiakasasian lähettämisen Zendesk-palveluun.',zendeskSend:'Vie Zendesk-tukipyynnöksi',zendeskUnknown:'Vienti on epävarma. Tarkista Zendeskistä ennen uutta yritystä.',zendeskSent:'Zendesk-tunnus',zendeskHelp:'Valtuutuksen jälkeen voit viedä yksittäisiä tukipyyntöjä. Asiakkaiden tietoja ei lähetetä automaattisesti.',zendeskCallbackFailed:'Zendesk-valtuutus ei onnistunut. Tarkista yhteys ja käyttöoikeudet.',helpdesk:'Tukijärjestelmä',helpdeskIntro:'Yhdistä Freshdesk turvallisesti. Vain erikseen hyväksytyt tukipyynnöt lähetetään ulkoiseen palveluun.',subdomain:'Freshdesk-osoitteen alkuosa',apiKey:'Freshdesk API-avain',connect:'Yhdistä',test:'Testaa yhteys',disconnect:'Katkaise yhteys',connected:'Yhdistetty',notConnected:'Ei yhdistetty',requesterEmail:'Asiakkaan sähköposti',sendTicket:'Vie tukipyyntö Freshdeskiin',exportApproval:'Hyväksyn tämän asiakasasian lähettämisen ulkoiseen Freshdesk-palveluun.',exported:'Viety Freshdeskiin',exportUnknown:'Vienti voi olla kesken tai epävarma. Tarkista Freshdeskistä ennen uusintaa.',badCredential:'Yhteyttä ei voitu vahvistaa. Tarkista osoite ja API-avain.',confirmDisconnect:'Katkaistaanko Freshdesk-yhteys? Aiempien vientien loki säilyy.',quality:'Laatu',insights:'Tulokset',qualityIntro:'Käsittele puutteelliset vastaukset. Korjaukset eivät muuta botin tietopohjaa ilman erillistä hyväksyntää.',insightsIntro:'Vastaukset, liidit ja toiminnot kanavittain. Automaattinen vastaus ei todista asian ratkaisua.',period:'Ajanjakso',replies:'Viestit',automated:'AI-vastaukset',handoffs:'Siirrot ihmiselle',cited:'Lähteelliset AI-vastaukset',qualityOpen:'Avoimet laatutarkistukset',reviewReason:'Virheen tyyppi',flag:'Merkitse tarkistettavaksi',resolve:'Merkitse korjatuksi',dismiss:'Hylkää havainto',resolution:'Miten virhe korjattiin ja varmistettiin?',flags:'Tarkistettavat keskustelut',recentReviews:'Laatumerkinnät',channels:'Kanavittain',daily:'Päivittäiset keskustelut',disclaimerQuality:'Vastausprosentti ei ole asiakastyytyväisyys- tai oikeellisuusmittari. Virheellinen tieto pitää korjata hyväksyttyyn lähteeseen.',reasonIncorrect:'Virheellinen tieto',reasonOutdated:'Vanhentunut tieto',reasonLanguage:'Väärä kieli',reasonIntent:'Väärin ymmärretty kysymys',reasonHandoff:'Tarpeeton siirto',reasonOther:'Muu',knowledge:'Tietopohja',approvedFacts:'Hyväksytyt tiedot',contacts:'Asiakasrekisteri',tickets:'Tukipyynnöt',quotes:'Tarjoukset',rules:'Automaatiot',docs:'Tietopankki',
      contactIntro:'Tallennetut asiakkaat ja liidit.',ticketIntro:'Sisäiset palvelupyynnöt työntekijöille.',
      quoteIntro:'Luonnokset yrityksen tallennetuista hinnoista. Lähetys vaatii ihmisen hyväksynnän.',
      docsIntro:'Julkaise vain tarkistettua yritystietoa, jota botti saa käyttää vastauksissa.',
      name:'Nimi',email:'Sähköposti',phone:'Puhelin',note:'Lisätiedot',save:'Tallenna',
      title:'Otsikko',details:'Kuvaus',priority:'Kiireellisyys',normal:'Normaali',urgent:'Kiireellinen',
      quantity:'Määrä',create:'Luo',approve:'Hyväksy',remove:'Poista',
      published:'Julkaistu',publishConsent:'Hyväksyn tiedon julkaisemisen botin tietopohjaan.',
      documentBody:'Dokumentin tarkistettu sisältö',empty:'Ei vielä tietoja.',
      loading:'Haetaan tietoja…',saving:'Tallennetaan…',saved:'Tallennettu.',
      error:'Toiminto epäonnistui.',notConfigured:'Aseta ensin palveluhinnat kohdassa Hintalaskuri.',
      new:'Uusi',contacted:'Kontaktoitu',qualified:'Kvalifioitu',won:'Voitettu',lost:'Hävitty',
      open:'Avoin',in_progress:'Käsittelyssä',waiting:'Odottaa',done:'Valmis',
      draft:'Luonnos',approved:'Hyväksytty',triggerLead:'Uusi liidi → tallenna CRM:ään',
      triggerAction:'Uusi asiakaspyyntö → luo tiketti',recent:'Viimeaikaiset automaatiot',
      confirmDelete:'Poistetaanko dokumentti myös botin tietopohjasta?',notice:'Sisäiset toiminnot suoritetaan Respondossa. Freshdesk-yhteys aktivoidaan vain erikseen.'},
    sv:{tasks:'Uppgifter',tasksIntro:'Respondos egna påminnelser och uppföljningar. Leads och kundförfrågningar kan automatiskt skapa interna uppgifter utan externa tjänster.',tasksOpen:'Öppna',tasksOverdue:'Försenade',tasksCompleted:'Klart',tasksDue:'Förfallodag',tasksTitle:'Uppgiftens titel',tasksDetails:'Beskrivning',tasksCreate:'Skapa uppgift',tasksDone:'Markera klar',tasksReopen:'Öppna igen',tasksEmpty:'Inga uppgifter.',tasksNoNotifications:'Påminnelser visas endast i Respondo. Inga externa e-postmeddelanden eller SMS skickas.',tasksUrgent:'Brådskande',tasksNormal:'Normal',tasksLate:'Försenad',calendar:'Egen kalender',calendarIntro:'Respondos egen bokning utan Google eller externa kalendrar. Bekräfta endast efter att ha kontrollerat arbetslängd och kunduppgifter.',calendarStart:'Starttid',calendarEnd:'Sluttid',calendarAddSlot:'Lägg till ledig tid',calendarAvailable:'Lediga tider',calendarPending:'Bokningsförfrågningar som väntar på granskning',calendarConfirmed:'Bokningar',calendarConfirm:'Bekräfta bokning',calendarReject:'Avvisa förfrågan',calendarCancel:'Avboka',calendarNote:'Anteckning om beslut',calendarDuration:'Beräknad arbetstid',calendarMinutes:'minuter',calendarNoSlots:'Inga lediga tider.',calendarNoRequests:'Inga öppna förfrågningar.',calendarNoEvents:'Inga bokningar ännu.',calendarExternalWarning:'Bokningarna lagras endast i Respondo. Externa kalendrar uppdateras inte och kunden får ingen automatisk bekräftelse.',calendarConfirmPrompt:'Har du kontrollerat arbetslängd, personalens tillgänglighet och kunduppgifter och vill bekräfta bokningen?',calendarRejectPrompt:'Avvisa denna preliminära bokningsförfrågan?',calendarCancelPrompt:'Avboka den interna bokningen? Kunden meddelas inte automatiskt.',calendarInvalidDates:'Kontrollera start- och sluttid.',calendarNotifyManually:'Meddela kunden separat om bekräftelse eller avbokning.',calendarStatusBooked:'Bokad',calendarStatusOpen:'Ledig',calendarStatusCancelled:'Avbokad',inbox:'Inkorg',inboxIntro:'Respondos egna webbchattar och konversationshistorik från API-kanaler. Svar kan skickas till webbchatten; övriga kanaler sparas endast som utkast.',inboxEmpty:'Inga konversationer.',inboxOpen:'Öppna konversation',inboxBack:'Tillbaka till listan',inboxReply:'Svara i webbchatten',inboxMailReply:'Skicka godkänt e-postsvar',inboxMetaReply:'Skicka godkänt kanalsvar',inboxMetaConfirm:'Godkänner du att detta meddelande skickas till kunden i den externa kanalen? Kontrollera innehåll och mottagare.',inboxMetaSent:'Kanalsvar skickat.',inboxMetaUnknown:'Leveransstatus är osäker. Kontrollera den externa kanalen före ett nytt försök.',inboxMailConfirm:'Godkänner du att detta svar skickas till kundens e-post? Kontrollera innehåll, mottagare och eventuella bokningslöften.',inboxMailSent:'E-post skickat.',inboxMailUnknown:'Leveransstatus är osäker. Kontrollera Skickat innan du försöker igen.',inboxSaveDraft:'Spara utkast',inboxNewNote:'Privat anteckning',inboxNoteSave:'Lägg till anteckning',inboxSuggestion:'Hitta källbaserat förslag',inboxUseSuggestion:'Använd förslaget som utkast',inboxNoSuggestion:'Inget tillräckligt relevant källförslag.',inboxSuggestionWarning:'Kontrollera fakta, språk och relevans innan du skickar.',inboxDraft:'Svarsutkast',inboxExternalOnly:'Ingen leverans är ansluten för externa kanaler. Meddelandet sparas endast som utkast i Respondo.',inboxMarkClosed:'Markera som behandlad',inboxReopen:'Öppna igen',inboxNoMessages:'Inga meddelanden.',inboxNotes:'Interna anteckningar',inboxSent:'Svar sparat i webbchatten.',inboxNoDelivery:'Inte skickat till externa tjänster.',inboxMessage:'Skriv svar',inboxStatusOpen:'Öppen',inboxStatusClosed:'Stängd',repairTitle:'Förslag till rättelser',repairIntro:'Förslagen kommer enbart från företagets aktuella godkända källor. Kontrollera källan och en allmän fråga före godkännande.',repairApprove:'Godkänn källbunden rättelse',repairQuestion:'Allmän kundfråga (utan personuppgifter)',repairSource:'Föreslagen källa',repairNoCandidates:'Inga verifierbara rättelseförslag.',repairNote:'Svaret hämtas alltid från den ursprungliga godkända källan. Rättelsen upphör om källan tas bort.',repairApproved:'Godkända rättelser',repairConfirm:'Jag har kontrollerat källan och godkänner kopplingen.',repairQuality:'Förslag, inte ett verifierat svar',zendesk:'Zendesk OAuth',zendeskIntro:'Anslut företagets Zendesk-konto med OAuth. Supportärenden exporteras endast med ditt uttryckliga godkännande.',zendeskNotConfigured:'Zendesk OAuth-klienten är inte konfigurerad. Kontakta Respondo-administratören.',zendeskDomain:'Zendesk-underdomän',zendeskAuthorize:'Auktorisera Zendesk',zendeskScope:'Begärda behörigheter: tickets:read och tickets:write.',zendeskConnected:'Zendesk ansluten',zendeskDisconnected:'Zendesk inte ansluten',zendeskStartError:'Kunde inte starta auktoriseringen.',zendeskDisconnect:'Koppla bort Zendesk',zendeskDisconnectConfirm:'Ta bort Zendesk-auktoriseringen? Exporthistoriken behålls.',zendeskExportConsent:'Jag godkänner att detta kundärende skickas till Zendesk.',zendeskSend:'Exportera till Zendesk',zendeskUnknown:'Exportstatus oklar. Kontrollera Zendesk före ett nytt försök.',zendeskSent:'Zendesk-ärende',zendeskHelp:'Efter auktorisering kan du exportera enskilda ärenden. Kunddata skickas inte automatiskt.',zendeskCallbackFailed:'Zendesk-auktoriseringen misslyckades. Kontrollera behörigheterna.',helpdesk:'Supportsystem',helpdeskIntro:'Anslut Freshdesk säkert. Endast separat godkända ärenden skickas till tjänsten.',subdomain:'Freshdesk-underdomän',apiKey:'Freshdesk API-nyckel',connect:'Anslut',test:'Testa anslutning',disconnect:'Koppla bort',connected:'Ansluten',notConnected:'Inte ansluten',requesterEmail:'Kundens e-post',sendTicket:'Exportera ärende till Freshdesk',exportApproval:'Jag godkänner att kundärendet skickas till Freshdesk.',exported:'Exporterad till Freshdesk',exportUnknown:'Exportstatus är osäker. Kontrollera i Freshdesk före nytt försök.',badCredential:'Anslutningen kunde inte verifieras. Kontrollera domän och API-nyckel.',confirmDisconnect:'Koppla bort Freshdesk? Tidigare exporthistorik sparas.',quality:'Kvalitet',insights:'Resultat',qualityIntro:'Granska osäkra svar. Ändringar i kunskapsbasen kräver separat godkännande.',insightsIntro:'Svar, leads och åtgärder per kanal. Ett automatiskt svar är inte ett bevis på att ärendet lösts.',period:'Period',replies:'Meddelanden',automated:'AI-svar',handoffs:'Överlämningar',cited:'AI-svar med källor',qualityOpen:'Öppna kvalitetsgranskningar',reviewReason:'Feltyp',flag:'Markera för granskning',resolve:'Markera som åtgärdad',dismiss:'Avfärda',resolution:'Hur rättades och verifierades felet?',flags:'Konversationer att granska',recentReviews:'Kvalitetsrapporter',channels:'Per kanal',daily:'Dagliga konversationer',disclaimerQuality:'Svarsfrekvensen mäter varken kundnöjdhet eller korrekthet. Felaktig information ska korrigeras i en godkänd källa.',reasonIncorrect:'Felaktig information',reasonOutdated:'Inaktuell information',reasonLanguage:'Fel språk',reasonIntent:'Missförstod frågan',reasonHandoff:'Onödig överlämning',reasonOther:'Annat',knowledge:'Kunskapsbas',approvedFacts:'Godkända uppgifter',contacts:'Kundregister',tickets:'Supportärenden',quotes:'Offerter',rules:'Automatiseringar',docs:'Kunskapsbas',
      contactIntro:'Sparade kunder och leads.',ticketIntro:'Interna serviceärenden för personal.',
      quoteIntro:'Utkast baserade på företagets sparade priser. Leverans kräver mänskligt godkännande.',
      docsIntro:'Publicera endast granskade företagsuppgifter som botten får använda.',
      name:'Namn',email:'E-post',phone:'Telefon',note:'Anteckningar',save:'Spara',
      title:'Rubrik',details:'Beskrivning',priority:'Prioritet',normal:'Normal',urgent:'Brådskande',
      quantity:'Antal',create:'Skapa',approve:'Godkänn',remove:'Ta bort',
      published:'Publicerad',publishConsent:'Jag godkänner publicering i bottens kunskapsbas.',
      documentBody:'Granskat dokumentinnehåll',empty:'Inga poster ännu.',
      loading:'Hämtar uppgifter…',saving:'Sparar…',saved:'Sparat.',
      error:'Åtgärden misslyckades.',notConfigured:'Ange tjänstepriser i prisberäknaren först.',
      new:'Ny',contacted:'Kontaktad',qualified:'Kvalificerad',won:'Vunnen',lost:'Förlorad',
      open:'Öppen',in_progress:'Pågår',waiting:'Väntar',done:'Klar',
      draft:'Utkast',approved:'Godkänd',triggerLead:'Nytt lead → spara i CRM',
      triggerAction:'Ny kundförfrågan → skapa ärende',recent:'Senaste automatiseringar',
      confirmDelete:'Ta bort dokumentet även från bottens kunskapsbas?',notice:'Interna funktioner körs i Respondo. Freshdesk ansluts endast separat.'},
    en:{tasks:'Tasks',tasksIntro:'Respondo-native reminders and follow-ups. Leads and customer actions can automatically create internal tasks without outside services.',tasksOpen:'Open',tasksOverdue:'Overdue',tasksCompleted:'Completed',tasksDue:'Due date',tasksTitle:'Task title',tasksDetails:'Details',tasksCreate:'Create task',tasksDone:'Mark done',tasksReopen:'Reopen',tasksEmpty:'No tasks yet.',tasksNoNotifications:'Reminders are displayed inside Respondo only. No external emails or SMS messages are sent.',tasksUrgent:'Urgent',tasksNormal:'Normal',tasksLate:'Overdue',calendar:'Own calendar',calendarIntro:'Respondo-native booking without Google or other external calendars. Confirm only after verifying workload duration and customer details.',calendarStart:'Start time',calendarEnd:'End time',calendarAddSlot:'Add available time',calendarAvailable:'Open slots',calendarPending:'Booking requests awaiting approval',calendarConfirmed:'Reservations',calendarConfirm:'Confirm booking',calendarReject:'Reject request',calendarCancel:'Cancel booking',calendarNote:'Decision note',calendarDuration:'Estimated job duration',calendarMinutes:'minutes',calendarNoSlots:'No available slots.',calendarNoRequests:'No pending requests.',calendarNoEvents:'No reservations yet.',calendarExternalWarning:'Reservations are stored only in Respondo. No external calendar is updated and no customer confirmation is sent automatically.',calendarConfirmPrompt:'Have you checked the work duration, staff availability, and customer details and want to confirm?',calendarRejectPrompt:'Reject this tentative booking request?',calendarCancelPrompt:'Cancel this internal booking? The customer will not be notified automatically.',calendarInvalidDates:'Check the start and end times.',calendarNotifyManually:'Notify the customer separately of confirmation or cancellation.',calendarStatusBooked:'Booked',calendarStatusOpen:'Open',calendarStatusCancelled:'Cancelled',inbox:'Inbox',inboxIntro:'Respondo website conversations and history from API channels. Replies can be delivered to the website chat; other channels save drafts only.',inboxEmpty:'No conversations yet.',inboxOpen:'Open conversation',inboxBack:'Back to conversations',inboxReply:'Reply to website chat',inboxMailReply:'Send approved email reply',inboxMetaReply:'Send approved channel reply',inboxMetaConfirm:'Approve sending this message to the customer through the external channel? Check recipient and content.',inboxMetaSent:'Channel reply sent.',inboxMetaUnknown:'Delivery uncertain. Check the external channel before trying another message.',inboxMailConfirm:'Approve sending this message to the customer email? Verify the content, recipient and any booking promises.',inboxMailSent:'Email sent.',inboxMailUnknown:'Delivery status is uncertain. Check the sending mailbox before attempting another reply.',inboxSaveDraft:'Save draft',inboxNewNote:'Private note',inboxNoteSave:'Add note',inboxSuggestion:'Find source-backed suggestion',inboxUseSuggestion:'Use suggestion as draft',inboxNoSuggestion:'No sufficiently relevant source suggestion.',inboxSuggestionWarning:'Review source accuracy, language and relevance before sending.',inboxDraft:'Reply draft',inboxExternalOnly:'External message delivery is not connected. This message remains a draft inside Respondo.',inboxMarkClosed:'Mark resolved',inboxReopen:'Reopen',inboxNoMessages:'No messages.',inboxNotes:'Internal notes',inboxSent:'Reply saved to website chat.',inboxNoDelivery:'No external provider was contacted.',inboxMessage:'Write reply',inboxStatusOpen:'Open',inboxStatusClosed:'Closed',repairTitle:'Suggested fixes',repairIntro:'Suggestions use only this company’s currently approved facts. Verify the source and a generic customer question before approving.',repairApprove:'Approve source-backed fix',repairQuestion:'Generic customer question (no personal data)',repairSource:'Suggested evidence',repairNoCandidates:'No source-backed fix suggestions available.',repairNote:'The answer is read from the original approved source each time. Removing the source disables the fix.',repairApproved:'Approved fixes',repairConfirm:'I verified the source and approve linking this question to it.',repairQuality:'Suggestion, not verified answer',zendesk:'Zendesk OAuth',zendeskIntro:'Connect your company Zendesk account using OAuth. Support tickets are exported only with your explicit approval.',zendeskNotConfigured:'The Zendesk OAuth client is not configured yet. Contact your Respondo administrator.',zendeskDomain:'Zendesk subdomain',zendeskAuthorize:'Authorize Zendesk',zendeskScope:'Requested scopes: tickets:read and tickets:write.',zendeskConnected:'Zendesk connected',zendeskDisconnected:'Zendesk disconnected',zendeskStartError:'Could not start Zendesk authorization.',zendeskDisconnect:'Disconnect Zendesk',zendeskDisconnectConfirm:'Remove Zendesk authorization? Previous export audit is retained.',zendeskExportConsent:'I approve sending this customer ticket to Zendesk.',zendeskSend:'Export to Zendesk',zendeskUnknown:'Export status is uncertain. Check Zendesk before retrying.',zendeskSent:'Zendesk ticket',zendeskHelp:'After authorization you can export tickets individually. No customer data is sent automatically.',zendeskCallbackFailed:'Zendesk authorization failed. Check your account permissions.',helpdesk:'Helpdesk',helpdeskIntro:'Connect Freshdesk securely. Only individually approved support tickets are sent to this external provider.',subdomain:'Freshdesk subdomain',apiKey:'Freshdesk API key',connect:'Connect',test:'Test connection',disconnect:'Disconnect',connected:'Connected',notConnected:'Not connected',requesterEmail:'Customer email',sendTicket:'Export ticket to Freshdesk',exportApproval:'I approve sending this customer ticket to the external Freshdesk service.',exported:'Exported to Freshdesk',exportUnknown:'Export status is uncertain. Reconcile in Freshdesk before any repeat.',badCredential:'The connection could not be verified. Check the domain and API key.',confirmDisconnect:'Disconnect Freshdesk? Previous export audit records remain.',quality:'Quality',insights:'Outcomes',qualityIntro:'Review uncertain answers. Changing the bot knowledge base requires separate approval.',insightsIntro:'Replies, leads and actions by channel. Automated replies do not prove customer resolution.',period:'Period',replies:'Messages',automated:'AI replies',handoffs:'Human handoffs',cited:'AI replies with sources',qualityOpen:'Open quality reviews',reviewReason:'Review reason',flag:'Flag for review',resolve:'Mark as fixed',dismiss:'Dismiss',resolution:'How was the issue corrected and verified?',flags:'Conversations to review',recentReviews:'Quality reviews',channels:'By channel',daily:'Daily conversations',disclaimerQuality:'Reply rate is not a customer-satisfaction or factual-accuracy metric. Correct false facts in an approved source.',reasonIncorrect:'Incorrect fact',reasonOutdated:'Outdated fact',reasonLanguage:'Wrong language',reasonIntent:'Misunderstood question',reasonHandoff:'Unnecessary handoff',reasonOther:'Other',knowledge:'Knowledge base',approvedFacts:'Approved facts',contacts:'Customer CRM',tickets:'Support tickets',quotes:'Quote drafts',rules:'Automations',docs:'Knowledge documents',
      contactIntro:'Saved customers and leads.',ticketIntro:'Internal service requests for your team.',
      quoteIntro:'Drafts based on your saved service prices. Sending requires human approval.',
      docsIntro:'Publish only verified business facts that the bot may use in its answers.',
      name:'Name',email:'Email',phone:'Phone',note:'Notes',save:'Save',
      title:'Title',details:'Details',priority:'Priority',normal:'Normal',urgent:'Urgent',
      quantity:'Quantity',create:'Create',approve:'Approve',remove:'Remove',
      published:'Published',publishConsent:'I approve publishing this content to the bot knowledge base.',
      documentBody:'Verified document text',empty:'No entries yet.',
      loading:'Loading data…',saving:'Saving…',saved:'Saved.',
      error:'The operation failed.',notConfigured:'Configure service prices in the quote calculator first.',
      new:'New',contacted:'Contacted',qualified:'Qualified',won:'Won',lost:'Lost',
      open:'Open',in_progress:'In progress',waiting:'Waiting',done:'Done',
      draft:'Draft',approved:'Approved',triggerLead:'Lead captured → save contact',
      triggerAction:'Customer action → open ticket',recent:'Recent automations',
      confirmDelete:'Remove this document from the bot knowledge base as well?',notice:'Internal actions run in Respondo. Freshdesk is connected only through a separate approval.'}
  };
  function locale(){
    const value=String(document.querySelector('#respondoWorkspace')?.dataset.lang ||
      document.documentElement.lang||'en').slice(0,2).toLowerCase();
    return copy[value]||copy.en;
  }
  function el(tag,cls,content){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(content!==undefined)node.textContent=String(content);
    return node;
  }
  function fields(form,items){
    for(const item of items){
      const label=el('label','native-label',item.label);
      const control=item.multiline?document.createElement('textarea'):document.createElement('input');
      control.name=item.name;
      if(item.type)control.type=item.type;
      control.required=item.required!==false;
      if(item.min!==undefined)control.min=String(item.min);
      if(item.maxlength)control.maxLength=item.maxlength;
      if(item.multiline)control.rows=4;
      label.appendChild(control);
      form.appendChild(label);
    }
  }
  function button(text,type='submit'){
    const b=el('button','native-button',text);b.type=type;return b;
  }
  function select(options,value,onChange){
    const node=el('select','native-select');
    for(const [key,name] of options){
      const o=el('option','',name);o.value=key;node.appendChild(o);
    }
    node.value=value;
    node.setAttribute('aria-label','Status');
    node.addEventListener('change',()=>onChange(node.value));
    return node;
  }
  function localStatus(value,t){return t[value]||value;}
  function idGuard(value){return typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value);}
  function init(){
    const app=document.getElementById('app');
    if(!app)return;
    new MutationObserver(mount).observe(app,{childList:true,subtree:true});
    mount();
  }
  function mount(){
    const target=document.getElementById('respondoNativeOperationsMount');
    if(!target||target.dataset.bound==='yes')return;
    target.dataset.bound='yes';
    const t=locale();
    const tabs=el('div','native-tabs');
    tabs.setAttribute('role','tablist');
    const content=el('div','native-content');
    const feedback=el('p','native-feedback',t.loading);
    feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
    target.append(tabs,content,feedback,el('p','native-disclaimer',t.notice));
    let active=new URLSearchParams(location.search).has('zendesk')?'zendesk':'contacts',data=null,report=null,repair=null,helpdesk=null,zendesk=null,taskboard=null,schedule=null,inbox=null,threadDetail=null,selectedThread=null,suggestion=null,busy=false,days=30,pendingDeliveryId=null,pendingReplyText='';
    const kinds=['contacts','tickets','quotes','rules','docs','inbox','calendar','tasks','quality','insights','helpdesk','zendesk'];
    for(const kind of kinds){
      const b=button(t[kind],'button');
      b.dataset.tab=kind;b.setAttribute('role','tab');
      b.addEventListener('click',()=>{
        active=kind;
        if(kind==='tasks'&&!taskboard)loadTasks();
        else if(kind==='calendar'&&!schedule)loadSchedule();
        else if(kind==='inbox'&&!inbox)loadInbox();
        else if(kind==='quality'){
          if(!report)loadQuality();
          if(!repair)loadRepair();
          else render();
        }else if(kind==='zendesk'&&!zendesk)loadZendesk();
        else if(kind==='helpdesk'&&!helpdesk)loadHelpdesk();
        else if(kind==='insights'&&!report)loadQuality();
        else render();
      });
      tabs.appendChild(b);
    }
    async function request(method,path=API,payload){
      const response=await fetch(path,{
        method,credentials:'same-origin',cache:'no-store',
        headers:{accept:'application/json','content-type':'application/json'},
        ...(payload?{body:JSON.stringify(payload)}:{})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(String(result.error||t.error).slice(0,200));
      return result.data;
    }




    const TASKS=API+'/tasks';
    async function loadTasks(){
      try{taskboard=await request('GET',TASKS);feedback.textContent='';render();}
      catch(error){feedback.textContent=error.message||t.error;}
    }
    async function taskAction(method,path,payload){
      if(busy)return;
      busy=true;feedback.textContent=t.saving;
      try{await request(method,path,payload);await loadTasks();feedback.textContent=t.saved;}
      catch(error){feedback.textContent=error.message||t.error;}
      finally{busy=false;}
    }

    const SCHEDULE=API+'/calendar';
    const scheduleDate=value=>{
      try{return new Date(value).toLocaleString(
        document.documentElement.lang||'en',{dateStyle:'medium',timeStyle:'short'}
      );}catch{return String(value||'');}
    };
    async function loadSchedule(){
      try{schedule=await request('GET',SCHEDULE);feedback.textContent='';render();}
      catch(error){feedback.textContent=error.message||t.error;}
    }
    async function scheduleAction(method,path,payload){
      if(busy)return;
      busy=true;feedback.textContent=t.saving;
      try{
        await request(method,path,payload);
        await loadSchedule();
        feedback.textContent=t.saved+' '+t.calendarNotifyManually;
      }catch(error){feedback.textContent=error.message||t.error;}
      finally{busy=false;}
    }

    const INBOX=API+'/inbox';
    async function loadInbox(){
      try{inbox=await request('GET',INBOX);feedback.textContent='';render();}
      catch(error){feedback.textContent=error.message||t.error;}
    }
    async function openInboxThread(id){
      if(!idGuard(id))return;
      selectedThread=id;suggestion=null;
      try{threadDetail=await request('GET',INBOX+'/'+id);feedback.textContent='';render();}
      catch(error){feedback.textContent=error.message||t.error;}
    }
    async function inboxAction(method,path,payload){
      if(busy)return;
      busy=true;feedback.textContent=t.saving;
      try{
        const result=await request(method,path,payload);
        await loadInbox();
        if(selectedThread)await openInboxThread(selectedThread);
        feedback.textContent=path.endsWith('/reply')?t.inboxSent:t.saved;
        if(path.endsWith('/reply')){pendingDeliveryId=null;pendingReplyText='';}
        return result;
      }catch(error){feedback.textContent=error.message||t.error;}
      finally{busy=false;}
    }

    const ZENDESK='/api/app/helpdesk/zendesk';
    async function loadZendesk(){
      try{zendesk=await request('GET',ZENDESK);feedback.textContent='';render();}
      catch(error){feedback.textContent=error.message||t.error;}
    }
    async function sendZendesk(method,path,payload){
      if(busy)return;
      busy=true;feedback.textContent=t.saving;
      try{
        const result=await request(method,path,payload);
        if(path.includes('/export')&&result.status!=='sent')
          throw Error(t.zendeskUnknown);
        await loadZendesk();feedback.textContent=t.saved;
      }catch(error){feedback.textContent=error.message||t.error;}
      finally{busy=false;}
    }

    const HELPDESK='/api/app/helpdesk/freshdesk';
    async function loadHelpdesk(){
      try{helpdesk=await request('GET',HELPDESK);feedback.textContent='';render();}
      catch(error){feedback.textContent=error.message||t.error;}
    }
    async function helpdeskAction(method,path,payload){
      if(busy)return;
      busy=true;feedback.textContent=t.saving;
      try{
        const result=await request(method,path,payload);
        if(method==='POST'&&(path===HELPDESK||path===HELPDESK+'/test')&&!result.connected)throw Error(t.badCredential);
        if(path.includes('/export')&&result.status!=='sent')throw Error(t.exportUnknown);
        await loadHelpdesk();feedback.textContent=t.saved;
      }catch(error){feedback.textContent=error.message||t.error;}
      finally{busy=false;}
    }
    async function loadRepair(){
      try{repair=await request('GET',API+'/quality/repair');feedback.textContent='';render();}
      catch(error){feedback.textContent=error.message||t.error;}
    }
    async function loadQuality(){
      try{report=await request('GET',API+'/quality?days='+days);feedback.textContent='';render();}
      catch(error){feedback.textContent=error.message||t.error;}
    }
    async function load(){
      try{data=await request('GET');feedback.textContent='';render();}
      catch(error){feedback.textContent=error.message||t.error;}
    }
    async function perform(method,path,payload){
      if(busy)return;
      busy=true;feedback.textContent=t.saving;
      try{
        await request(method,path,payload);
        if(active==='quality'){await loadQuality();await loadRepair();}
        else if(active==='insights')await loadQuality();
        else await load();
        feedback.textContent=t.saved;
      }
      catch(error){feedback.textContent=error.message||t.error;}
      finally{busy=false;}
    }
    function formFor(kind){
      const form=el('form','native-form');
      if(kind==='contacts'){
        fields(form,[{label:t.name,name:'name',maxlength:120},{label:t.email,name:'email',type:'email',required:false,maxlength:254},
          {label:t.phone,name:'phone',required:false,maxlength:40},{label:t.note,name:'note',required:false,maxlength:1200}]);
        form.addEventListener('submit',event=>{
          event.preventDefault();perform('POST',API+'/contacts',Object.fromEntries(new FormData(form)));
        });
      }else if(kind==='tickets'){
        fields(form,[{label:t.title,name:'title',maxlength:160},
          {label:t.details,name:'details',multiline:true,required:false}]);
        const label=el('label','native-label',t.priority);
        const urgent=select([['normal',t.normal],['urgent',t.urgent]],'normal',()=>{});
        urgent.name='priority';label.appendChild(urgent);form.appendChild(label);
        form.addEventListener('submit',event=>{
          event.preventDefault();perform('POST',API+'/tickets',Object.fromEntries(new FormData(form)));
        });
      }else if(kind==='quotes'){
        fields(form,[{label:t.quantity,name:'quantity',type:'number',min:'0.001',required:true},
          {label:t.note,name:'note',maxlength:700,required:false}]);
        form.addEventListener('submit',event=>{
          event.preventDefault();perform('POST',API+'/quotes',Object.fromEntries(new FormData(form)));
        });
      }else if(kind==='docs'){
        fields(form,[{label:t.title,name:'title',maxlength:160},
          {label:t.documentBody,name:'body',multiline:true}]);
        const l=el('label','native-checkbox');
        const check=el('input');check.type='checkbox';check.name='publish';check.required=true;
        l.append(check,document.createTextNode(t.publishConsent));form.appendChild(l);
        form.addEventListener('submit',event=>{
          event.preventDefault();
          perform('POST',API+'/documents',{
            title:form.elements.title.value,body:form.elements.body.value,publish:check.checked
          });
        });
      }
      if(kind!=='rules')form.appendChild(button(kind==='docs'?t.published:t.create));
      return form;
    }
    function recordCard(title,description){
      const box=el('article','native-record');
      box.appendChild(el('strong','native-record-title',title));
      if(description)box.appendChild(el('span','native-record-meta',description));
      return box;
    }

    function qualityMetric(parent,name,value){
      const item=el('article','native-quality-metric');
      item.append(el('span','native-quality-label',name),el('strong','native-quality-value',String(value)));
      parent.appendChild(item);
    }





    function renderTasks(){
      content.replaceChildren(el('p','native-intro',t.tasksIntro),
        el('p','native-disclaimer',t.tasksNoNotifications));
      if(!taskboard){content.appendChild(el('p','native-empty',t.loading));return;}
      const counts=el('div','native-quality-metrics');
      for(const [name,value] of [
        [t.tasksOpen,taskboard.counts?.open||0],
        [t.tasksOverdue,taskboard.counts?.overdue||0],
        [t.tasksCompleted,taskboard.counts?.completed||0]
      ])qualityMetric(counts,name,value);
      content.appendChild(counts);
      const form=el('form','native-form');
      fields(form,[{label:t.tasksTitle,name:'title',maxlength:160},
        {label:t.tasksDetails,name:'details',required:false,multiline:true,maxlength:1200}]);
      const dueLabel=el('label','native-label',t.tasksDue);
      const due=el('input');due.type='datetime-local';due.name='dueAt';due.required=true;
      dueLabel.appendChild(due);form.appendChild(dueLabel);
      const priorityLabel=el('label','native-label',t.priority);
      const priority=select([['normal',t.tasksNormal],['urgent',t.tasksUrgent]],'normal',()=>{});
      priorityLabel.appendChild(priority);form.appendChild(priorityLabel);
      form.appendChild(button(t.tasksCreate));
      form.addEventListener('submit',event=>{
        event.preventDefault();
        const value=new Date(due.value);
        if(!Number.isFinite(value.getTime())||value.getTime()<=Date.now()){
          feedback.textContent=t.calendarInvalidDates;return;
        }
        taskAction('POST',TASKS,{
          title:form.elements.title.value,details:form.elements.details.value,
          dueAt:value.toISOString(),priority:priority.value
        });
      });
      content.appendChild(form);
      const list=el('div','native-list');
      const upcoming=taskboard.tasks||[];
      for(const item of upcoming){
        const isLate=item.status==='open'&&new Date(item.due_at).getTime()<Date.now();
        const card=recordCard(item.title,
          t.tasksDue+': '+scheduleDate(item.due_at)+' · '+
          (item.priority==='urgent'?t.tasksUrgent:t.tasksNormal)+
          (isLate?' · '+t.tasksLate:''));
        if(item.details)card.appendChild(el('p','native-record-meta',item.details));
        const change=button(item.status==='open'?t.tasksDone:t.tasksReopen,'button');
        change.addEventListener('click',()=>{
          if(!idGuard(item.id))return;
          taskAction('PATCH',TASKS+'/'+item.id,{
            status:item.status==='open'?'done':'open'
          });
        });
        card.appendChild(change);list.appendChild(card);
      }
      if(!upcoming.length)list.appendChild(el('p','native-empty',t.tasksEmpty));
      content.appendChild(list);
    }

    function renderSchedule(){
      content.replaceChildren(el('p','native-intro',t.calendarIntro),
        el('p','native-disclaimer',t.calendarExternalWarning));
      if(!schedule){content.appendChild(el('p','native-empty',t.loading));return;}
      const addForm=el('form','native-form');
      const startLabel=el('label','native-label',t.calendarStart);
      const endLabel=el('label','native-label',t.calendarEnd);
      const start=el('input');start.type='datetime-local';start.required=true;
      const end=el('input');end.type='datetime-local';end.required=true;
      startLabel.appendChild(start);endLabel.appendChild(end);
      addForm.append(startLabel,endLabel,button(t.calendarAddSlot));
      addForm.addEventListener('submit',event=>{
        event.preventDefault();
        const a=new Date(start.value),b=new Date(end.value);
        if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||
          a.getTime()<=Date.now()||b.getTime()<=a.getTime()||b-a>24*60*60*1000){
          feedback.textContent=t.calendarInvalidDates;return;
        }
        scheduleAction('POST','/api/app/booking-slots/generate',{
          slots:[{start:a.toISOString(),end:b.toISOString()}]
        });
      });
      content.appendChild(addForm);
      const pending=el('div','native-list');
      pending.appendChild(el('h4','native-subtitle',t.calendarPending));
      for(const item of schedule.pending||[]){
        const requested=item.requestedSlot||{};
        const info=[
          item.customerName||'',item.contact||'',
          scheduleDate(requested.startsAt)+' – '+scheduleDate(requested.endsAt),
          t.calendarDuration+': '+String(item.serviceCapacity?.durationMinutes||'?')+' '+t.calendarMinutes
        ].filter(Boolean).join(' · ');
        const card=recordCard(item.customerName||t.calendarPending,info);
        const note=el('textarea','native-review-note');note.maxLength=600;note.rows=2;
        note.placeholder=t.calendarNote;note.setAttribute('aria-label',t.calendarNote);
        card.appendChild(note);
        const confirm=button(t.calendarConfirm,'button');
        confirm.addEventListener('click',()=>{
          if(!idGuard(item.id)||!window.confirm(t.calendarConfirmPrompt))return;
          scheduleAction('POST',SCHEDULE+'/requests/'+item.id+'/decision',{
            decision:'confirm',note:note.value
          });
        });
        const reject=button(t.calendarReject,'button');
        reject.addEventListener('click',()=>{
          if(!idGuard(item.id)||!window.confirm(t.calendarRejectPrompt))return;
          scheduleAction('POST',SCHEDULE+'/requests/'+item.id+'/decision',{
            decision:'reject',note:note.value
          });
        });
        card.append(confirm,reject);pending.appendChild(card);
      }
      if(!schedule.pending?.length)pending.appendChild(el('p','native-empty',t.calendarNoRequests));
      content.appendChild(pending);
      const events=el('div','native-list');
      events.appendChild(el('h4','native-subtitle',t.calendarConfirmed));
      for(const item of schedule.events||[]){
        const card=recordCard(scheduleDate(item.starts_at)+' – '+scheduleDate(item.ends_at),
          (item.status==='confirmed'?t.calendarStatusBooked:t.calendarStatusCancelled)
          +' · '+t.calendarDuration+': '+item.required_minutes+' '+t.calendarMinutes);
        if(item.status==='confirmed'){
          const cancel=button(t.calendarCancel,'button');
          cancel.addEventListener('click',()=>{
            if(idGuard(item.id)&&window.confirm(t.calendarCancelPrompt))
              scheduleAction('POST',SCHEDULE+'/events/'+item.id+'/cancel');
          });
          card.appendChild(cancel);
        }
        events.appendChild(card);
      }
      if(!schedule.events?.length)events.appendChild(el('p','native-empty',t.calendarNoEvents));
      content.appendChild(events);
      const slots=el('div','native-list');
      slots.appendChild(el('h4','native-subtitle',t.calendarAvailable));
      const upcoming=(schedule.slots||[]).filter(x=>x.status==='open');
      for(const slot of upcoming){
        const card=recordCard(scheduleDate(slot.starts_at)+' – '+scheduleDate(slot.ends_at),
          t.calendarStatusOpen);
        const remove=button(t.remove,'button');
        remove.addEventListener('click',()=>{
          if(idGuard(slot.id))
            scheduleAction('DELETE','/api/app/booking-slots/'+slot.id);
        });
        card.appendChild(remove);slots.appendChild(card);
      }
      if(!upcoming.length)slots.appendChild(el('p','native-empty',t.calendarNoSlots));
      content.appendChild(slots);
    }

    function renderInbox(){
      content.replaceChildren(el('p','native-intro',t.inboxIntro));
      if(!inbox){content.appendChild(el('p','native-empty',t.loading));return;}
      if(!selectedThread){
        const list=el('div','native-list');
        for(const item of inbox.threads||[]){
          const card=recordCard((item.source_channel||'website')+' · '+(item.language||'fi'),
            item.preview||t.inboxNoMessages);
          const status=el('span','native-record-state',
            item.status==='closed'?t.inboxStatusClosed:t.inboxStatusOpen);
          const open=button(t.inboxOpen,'button');
          open.addEventListener('click',()=>openInboxThread(item.id));
          card.append(status,open);list.appendChild(card);
        }
        if(!inbox.threads?.length)list.appendChild(el('p','native-empty',t.inboxEmpty));
        content.appendChild(list);return;
      }
      const goBack=button(t.inboxBack,'button');
      goBack.addEventListener('click',()=>{selectedThread=null;threadDetail=null;suggestion=null;render();});
      content.appendChild(goBack);
      if(!threadDetail){content.appendChild(el('p','native-empty',t.loading));return;}
      const thread=threadDetail.thread||{};
      content.appendChild(el('h4','native-subtitle',
        String(thread.source_channel||'website')+' · '+
        (thread.status==='closed'?t.inboxStatusClosed:t.inboxStatusOpen)));
      const statusButton=button(thread.status==='closed'?t.inboxReopen:t.inboxMarkClosed,'button');
      statusButton.addEventListener('click',()=>inboxAction('PATCH',INBOX+'/'+selectedThread+'/status',{
        status:thread.status==='closed'?'open':'closed'
      }));
      content.appendChild(statusButton);
      const messages=el('div','native-inbox-messages');
      for(const message of threadDetail.messages||[]){
        const card=el('article','native-inbox-message');
        card.append(el('strong','native-record-title',String(message.role||'')),
          el('p','native-inbox-text',message.message||''));
        messages.appendChild(card);
      }
      if(!threadDetail.messages?.length)messages.appendChild(el('p','native-empty',t.inboxNoMessages));
      content.appendChild(messages);
      const source=button(t.inboxSuggestion,'button');
      source.addEventListener('click',async()=>{
        try{const r=await request('GET',INBOX+'/'+selectedThread+'/suggestion');
          suggestion=r.suggestion||null;feedback.textContent=suggestion?'':t.inboxNoSuggestion;
          render();
        }catch(error){feedback.textContent=error.message||t.error;}
      });
      content.appendChild(source);
      const replyForm=el('form','native-inbox-reply');
      const label=el('label','native-label',t.inboxMessage);
      const input=el('textarea','native-review-note');
      input.rows=4;input.maxLength=4000;input.required=true;
      input.setAttribute('aria-label',t.inboxMessage);
      input.value=threadDetail.draft?.text||'';
      label.appendChild(input);replyForm.appendChild(label);
      if(suggestion){
        const evidence=el('div','native-inbox-evidence');
        evidence.append(el('strong','native-record-title',suggestion.sourceTitle),
          el('p','native-inbox-text',suggestion.suggestedText),
          el('p','native-disclaimer',t.inboxSuggestionWarning));
        const use=button(t.inboxUseSuggestion,'button');use.addEventListener('click',()=>{
          input.value=suggestion.suggestedText;input.focus();
        });
        evidence.appendChild(use);content.appendChild(evidence);
      }
      const controls=el('div','native-inbox-actions');
      const save=button(t.inboxSaveDraft,'button');
      save.addEventListener('click',()=>inboxAction('PUT',INBOX+'/'+selectedThread+'/draft',{text:input.value}));
      controls.appendChild(save);
      if(thread.canDeliverWithinRespondo&&thread.status!=='closed'){
        const send=button(t.inboxReply,'submit');controls.appendChild(send);
        replyForm.addEventListener('submit',event=>{
          event.preventDefault();if(busy)return;
          const value=input.value.trim();
          if(!value)return;
          if(value!==pendingReplyText||!pendingDeliveryId){
            pendingDeliveryId=crypto.randomUUID();pendingReplyText=value;
          }
          inboxAction('POST',INBOX+'/'+selectedThread+'/reply',{
            deliveryId:pendingDeliveryId,text:value
          });
        });
      }else if(thread.source_channel==='email'&&thread.status!=='closed'){
        const send=button(t.inboxMailReply,'button');
        send.addEventListener('click',async()=>{
          if(busy)return;
          const value=input.value.trim();
          if(!value||!window.confirm(t.inboxMailConfirm))return;
          if(value!==pendingReplyText||!pendingDeliveryId){
            pendingDeliveryId=crypto.randomUUID();pendingReplyText=value;
          }
          busy=true;feedback.textContent=t.saving;
          try{
            const result=await request('POST',INBOX+'/'+selectedThread+'/mail-reply',{
              deliveryId:pendingDeliveryId,text:value,approved:true
            });
            feedback.textContent=result.status==='sent'?t.inboxMailSent:t.inboxMailUnknown;
            if(result.status==='sent'){pendingDeliveryId=null;pendingReplyText='';}
          }catch(error){
            feedback.textContent=error.message||t.inboxMailUnknown;
          }finally{busy=false;}
        });
        controls.appendChild(send);
        replyForm.appendChild(el('p','native-disclaimer',t.inboxSuggestionWarning));
      }else if(['whatsapp','instagram','facebook'].includes(thread.source_channel)&&thread.status!=='closed'){
        const send=button(t.inboxMetaReply,'button');
        send.addEventListener('click',async()=>{
          if(busy)return;
          const value=input.value.trim();
          if(!value||!window.confirm(t.inboxMetaConfirm))return;
          if(value!==pendingReplyText||!pendingDeliveryId){
            pendingDeliveryId=crypto.randomUUID();pendingReplyText=value;
          }
          busy=true;feedback.textContent=t.saving;
          try{
            const result=await request('POST',INBOX+'/'+selectedThread+'/meta-reply',{
              deliveryId:pendingDeliveryId,text:value,approved:true
            });
            feedback.textContent=result.status==='sent'?t.inboxMetaSent:t.inboxMetaUnknown;
            if(result.status==='sent'){pendingDeliveryId=null;pendingReplyText='';}
          }catch(error){feedback.textContent=error.message||t.inboxMetaUnknown;}
          finally{busy=false;}
        });
        controls.appendChild(send);
        replyForm.appendChild(el('p','native-disclaimer',t.inboxSuggestionWarning));
      }else{
        replyForm.appendChild(el('p','native-disclaimer',
          thread.canDeliverWithinRespondo?t.inboxStatusClosed:t.inboxExternalOnly));
      }
      replyForm.appendChild(controls);content.appendChild(replyForm);
      const noteForm=el('form','native-inbox-note');
      const noteLabel=el('label','native-label',t.inboxNewNote);
      const note=el('textarea','native-review-note');note.required=true;note.maxLength=1200;
      note.rows=2;note.setAttribute('aria-label',t.inboxNewNote);
      noteLabel.appendChild(note);noteForm.append(noteLabel,button(t.inboxNoteSave));
      noteForm.addEventListener('submit',event=>{
        event.preventDefault();if(!note.value.trim())return;
        inboxAction('POST',INBOX+'/'+selectedThread+'/notes',{note:note.value});
      });
      content.appendChild(noteForm);
      if(threadDetail.notes?.length){
        content.appendChild(el('h4','native-subtitle',t.inboxNotes));
        for(const item of threadDetail.notes)content.appendChild(recordCard(item.note,''));
      }
    }

    function renderZendesk(){
      content.replaceChildren(el('p','native-intro',t.zendeskIntro));
      if(!zendesk){content.appendChild(el('p','native-empty',t.loading));return;}
      content.appendChild(el('h4','native-subtitle',
        zendesk.connected?t.zendeskConnected+': '+zendesk.subdomain+'.zendesk.com':t.zendeskDisconnected));
      content.appendChild(el('p','native-disclaimer',t.zendeskScope));
      if(!zendesk.configured){
        content.appendChild(el('p','native-disclaimer',t.zendeskNotConfigured));
      }else if(!zendesk.connected){
        const form=el('form','native-form');
        fields(form,[{label:t.zendeskDomain,name:'subdomain',maxlength:63}]);
        form.appendChild(button(t.zendeskAuthorize));
        form.addEventListener('submit',async event=>{
          event.preventDefault();if(busy)return;
          busy=true;feedback.textContent=t.saving;
          try{
            const r=await request('POST',ZENDESK+'/start',{
              subdomain:form.elements.subdomain.value
            });
            const uri=new URL(r.authorizationUrl);
            if(uri.protocol!=='https:'||!uri.hostname.endsWith('.zendesk.com')||
              uri.pathname!=='/oauth/authorizations/new')
              throw Error(t.zendeskStartError);
            window.location.assign(uri.toString());
          }catch(error){feedback.textContent=error.message||t.zendeskStartError;busy=false;}
        });
        content.appendChild(form);
      }else{
        const disconnect=button(t.zendeskDisconnect,'button');
        disconnect.addEventListener('click',()=>{
          if(window.confirm(t.zendeskDisconnectConfirm))sendZendesk('DELETE',ZENDESK);
        });
        content.appendChild(disconnect);
      }
      content.appendChild(el('p','native-disclaimer',t.zendeskHelp));
      if(!zendesk.connected||!data?.tickets?.length)return;
      const audit=new Map((zendesk.exports||[]).map(x=>[x.native_ticket_id,x]));
      const list=el('div','native-list');
      list.appendChild(el('h4','native-subtitle',t.tickets));
      for(const ticket of data.tickets){
        const card=recordCard(ticket.title,ticket.details);
        const prior=audit.get(ticket.id);
        if(prior){
          card.appendChild(el('span','native-record-state',
            prior.status==='sent'?t.zendeskSent+' #'+prior.external_ticket_id:t.zendeskUnknown));
        }else{
          const form=el('form','native-helpdesk-export');
          const email=el('input','native-review-note');
          email.type='email';email.required=true;email.maxLength=254;
          email.placeholder=t.requesterEmail;email.setAttribute('aria-label',t.requesterEmail);
          const label=el('label','native-checkbox');
          const consent=el('input');consent.type='checkbox';consent.required=true;
          label.append(consent,document.createTextNode(t.zendeskExportConsent));
          form.append(email,label,button(t.zendeskSend));
          form.addEventListener('submit',event=>{
            event.preventDefault();
            if(!idGuard(ticket.id)||!consent.checked)return;
            sendZendesk('POST',ZENDESK+'/tickets/'+ticket.id+'/export',
              {requesterEmail:email.value,approved:true});
          });
          card.appendChild(form);
        }
        list.appendChild(card);
      }
      content.appendChild(list);
    }

    function renderHelpdesk(){
      content.replaceChildren(el('p','native-intro',t.helpdeskIntro));
      if(!helpdesk){content.appendChild(el('p','native-empty',t.loading));return;}
      content.appendChild(el('h4','native-subtitle',
        helpdesk.connected ? (t.connected+': '+helpdesk.subdomain+'.freshdesk.com') : t.notConnected));
      const connection=el('form','native-form');
      fields(connection,[{label:t.subdomain,name:'subdomain',required:true,maxlength:63},
        {label:t.apiKey,name:'apiKey',required:true,maxlength:512}]);
      connection.elements.subdomain.value=helpdesk.subdomain||'';
      connection.elements.apiKey.type='password';
      connection.elements.apiKey.autocomplete='new-password';
      connection.appendChild(button(t.connect));
      connection.addEventListener('submit',event=>{
        event.preventDefault();
        helpdeskAction('POST',HELPDESK,{
          subdomain:connection.elements.subdomain.value,apiKey:connection.elements.apiKey.value
        });
        connection.elements.apiKey.value='';
      });
      content.appendChild(connection);
      if(helpdesk.connected){
        const actions=el('div','native-quality-toolbar');
        const test=button(t.test,'button');
        test.addEventListener('click',()=>helpdeskAction('POST',HELPDESK+'/test'));
        const disconnect=button(t.disconnect,'button');
        disconnect.addEventListener('click',()=>{
          if(window.confirm(t.confirmDisconnect))helpdeskAction('DELETE',HELPDESK);
        });
        actions.append(test,disconnect);content.appendChild(actions);
      }
      if(!data?.tickets?.length)return;
      const audit=new Map((helpdesk.exports||[]).map(x=>[x.native_ticket_id,x]));
      const list=el('div','native-list');
      list.appendChild(el('h4','native-subtitle',t.tickets));
      for(const item of data.tickets){
        const record=recordCard(item.title,item.details);
        const previous=audit.get(item.id);
        if(previous){
          record.appendChild(el('span','native-record-state',
            previous.status==='sent'?t.exported+' #'+previous.external_ticket_id:t.exportUnknown));
        }else if(helpdesk.connected){
          const form=el('form','native-helpdesk-export');
          const email=el('input','native-review-note');
          email.type='email';email.required=true;email.maxLength=254;
          email.placeholder=t.requesterEmail;email.setAttribute('aria-label',t.requesterEmail);
          const consent=el('label','native-checkbox');
          const checked=el('input');checked.type='checkbox';checked.required=true;
          consent.append(checked,document.createTextNode(t.exportApproval));
          form.append(email,consent,button(t.sendTicket));
          form.addEventListener('submit',event=>{
            event.preventDefault();
            if(!idGuard(item.id)||!checked.checked)return;
            helpdeskAction('POST',HELPDESK+'/tickets/'+item.id+'/export',
              {requesterEmail:email.value,approved:true});
          });
          record.appendChild(form);
        }
        list.appendChild(record);
      }
      content.appendChild(list);
    }


    function renderRepairSuggestions(){
      const block=el('section','native-quality-repair');
      block.append(el('h4','native-subtitle',t.repairTitle),
        el('p','native-disclaimer',t.repairIntro));
      const fixes=repair?.suggestions||[];
      if(!repair){block.appendChild(el('p','native-empty',t.loading));return block;}
      if(!fixes.length)block.appendChild(el('p','native-empty',t.repairNoCandidates));
      for(const item of fixes){
        const card=recordCard(item.question,t.repairQuality);
        const form=el('form','native-quality-repair-form');
        const question=el('label','native-label',t.repairQuestion);
        const questionInput=el('input','native-review-question');
        questionInput.type='text';questionInput.required=true;questionInput.minLength=9;questionInput.maxLength=180;
        questionInput.value=item.question;questionInput.setAttribute('aria-label',t.repairQuestion);
        question.appendChild(questionInput);
        const source=el('label','native-label',t.repairSource);
        const dropdown=select(item.candidates.map(c=>[c.sourceId,c.title]),
          item.candidates[0]?.sourceId||'',()=>refreshEvidence());
        source.appendChild(dropdown);
        const evidence=el('p','native-repair-evidence');
        function refreshEvidence(){
          const selected=item.candidates.find(c=>c.sourceId===dropdown.value);
          evidence.textContent=selected?selected.excerpt:'';
        }
        refreshEvidence();
        const approval=el('label','native-checkbox');
        const checkbox=el('input');checkbox.type='checkbox';checkbox.required=true;
        approval.append(checkbox,document.createTextNode(t.repairConfirm));
        form.append(question,source,evidence,approval,button(t.repairApprove));
        form.addEventListener('submit',event=>{
          event.preventDefault();
          if(!checkbox.checked||!idGuard(item.conversationId)||!idGuard(dropdown.value))return;
          perform('POST',API+'/quality/repair',{
            conversationId:item.conversationId,
            sourceId:dropdown.value,
            question:questionInput.value,
            approved:true
          });
        });
        card.appendChild(form);block.appendChild(card);
      }
      const approved=repair?.approved||[];
      if(approved.length){
        block.appendChild(el('h4','native-subtitle',t.repairApproved));
        for(const x of approved.slice(0,30))
          block.appendChild(recordCard(x.question,''));
      }
      block.appendChild(el('p','native-disclaimer',t.repairNote));
      return block;
    }

    function renderQualityCenter(){
      const isQuality=active==='quality';
      content.replaceChildren(el('p','native-intro',isQuality?t.qualityIntro:t.insightsIntro));
      const toolbar=el('div','native-quality-toolbar');
      toolbar.appendChild(el('span','native-quality-label',t.period));
      toolbar.appendChild(select([['7','7'],['30','30'],['90','90']].map(x=>[x[0],x[1]+' d']),
        String(days),value=>{days=Number(value);loadQuality();}));
      content.appendChild(toolbar);
      if(!report){content.appendChild(el('p','native-empty',t.loading));return;}
      const summary=report.summary||{};
      const metrics=el('div','native-quality-metrics');
      for(const [name,value] of [
        [t.replies,summary.total||0],
        [t.automated,summary.automated||0],
        [t.handoffs,summary.handoffs||0],
        [t.cited,summary.evidenced||0],
        [t.qualityOpen,summary.openReviews||0],
        [t.knowledge+' · '+t.approvedFacts,report.knowledge?.approved||0],
      ])qualityMetric(metrics,name,value);
      content.appendChild(metrics);
      content.appendChild(el('p','native-disclaimer',t.disclaimerQuality));
      if(!isQuality){
        const channels=el('div','native-list');
        channels.appendChild(el('h4','native-subtitle',t.channels));
        for(const ch of summary.byChannel||[]){
          channels.appendChild(recordCard(ch.channel,
            t.replies+': '+ch.total+' · '+t.automated+': '+ch.automated+
            ' · '+t.handoffs+': '+ch.handoffs));
        }
        channels.appendChild(el('h4','native-subtitle',t.daily));
        for(const day of report.daily||[]){
          channels.appendChild(recordCard(String(day.day).slice(0,10),
            t.replies+': '+day.total+' · '+t.handoffs+': '+day.handoffs));
        }
        for(const [name,value] of [
          [t.contacts,summary.leads||0],
          [t.tickets,summary.tickets||0],
          [t.rules,summary.actions||0]
        ])channels.appendChild(recordCard(name,String(value)));
        content.appendChild(channels);
        return;
      }
      const reasons=[
        ['incorrect_fact',t.reasonIncorrect],['outdated_fact',t.reasonOutdated],
        ['wrong_language',t.reasonLanguage],['misunderstood_question',t.reasonIntent],
        ['unnecessary_handoff',t.reasonHandoff],['other',t.reasonOther]
      ];
      const reviews=el('div','native-list');
      reviews.appendChild(el('h4','native-subtitle',t.recentReviews));
      for(const review of report.reviews||[]){
        const card=recordCard(review.question,review.reason+' · '+localStatus(review.status,t));
        if(review.note)card.appendChild(el('p','native-record-meta',review.note));
        if(review.status==='open'){
          const note=el('textarea','native-review-note');note.maxLength=1200;
          note.placeholder=t.resolution;note.rows=2;note.setAttribute('aria-label',t.resolution);
          card.appendChild(note);
          const resolved=button(t.resolve,'button');
          resolved.addEventListener('click',()=>idGuard(review.id)&&perform('PATCH',
            API+'/quality/reviews/'+review.id,{status:'resolved',resolutionNote:note.value}));
          const dismiss=button(t.dismiss,'button');
          dismiss.addEventListener('click',()=>idGuard(review.id)&&perform('PATCH',
            API+'/quality/reviews/'+review.id,{status:'dismissed'}));
          card.append(resolved,dismiss);
        }
        reviews.appendChild(card);
      }
      if(!report.reviews?.length)reviews.appendChild(el('p','native-empty',t.empty));
      reviews.appendChild(el('h4','native-subtitle',t.flags));
      const already=new Set((report.reviews||[]).filter(x=>x.status==='open').map(x=>x.conversationId));
      for(const gap of (report.gaps||[]).filter(x=>!already.has(x.conversationId))){
        const card=recordCard(gap.question,gap.channel+' · '+(gap.intent||''));
        const dropdown=select(reasons,'incorrect_fact',()=>{});
        dropdown.setAttribute('aria-label',t.reviewReason);
        const note=el('textarea','native-review-note');note.maxLength=1200;note.rows=2;
        note.placeholder=t.note;note.setAttribute('aria-label',t.note);
        const flag=button(t.flag,'button');
        flag.addEventListener('click',()=>idGuard(gap.conversationId)&&perform('POST',
          API+'/quality/reviews',{conversationId:gap.conversationId,reason:dropdown.value,note:note.value}));
        card.append(dropdown,note,flag);reviews.appendChild(card);
      }
      content.appendChild(reviews);
      content.appendChild(renderRepairSuggestions());
    }

    function render(){
      if(!data)return;
      for(const tab of tabs.children){
        tab.setAttribute('aria-selected',String(tab.dataset.tab===active));
      }
      if(active==='tasks'){renderTasks();return;}
      if(active==='calendar'){renderSchedule();return;}
      if(active==='inbox'){renderInbox();return;}
      if(active==='quality'||active==='insights'){renderQualityCenter();return;}
      if(active==='helpdesk'){renderHelpdesk();return;}
      if(active==='zendesk'){renderZendesk();return;}
      content.replaceChildren(el('p','native-intro',
        t[active==='contacts'?'contactIntro':active==='tickets'?'ticketIntro':
          active==='quotes'?'quoteIntro':active==='docs'?'docsIntro':'notice']));
      if(active!=='rules')content.appendChild(formFor(active));
      const list=el('div','native-list');
      const rows=active==='docs'?data.documents:data[active]||[];
      if(active==='rules'){
        for(const rule of data.rules||[]){
          const label=el('label','native-rule');
          const check=el('input');check.type='checkbox';check.checked=Boolean(rule.enabled);
          const description=rule.trigger_key==='lead_captured'?t.triggerLead:t.triggerAction;
          label.append(check,document.createTextNode(description));
          check.addEventListener('change',()=>perform('PUT',API+'/rules',{
            trigger:rule.trigger_key,action:rule.action_key,enabled:check.checked
          }));
          list.appendChild(label);
        }
        list.appendChild(el('h4','native-subtitle',t.recent));
        const count=el('p','native-recent',String((data.recentRuns||[]).length));
        list.appendChild(count);
      }else{
        for(const item of rows){
          const row=recordCard(
            active==='contacts'?item.name:active==='tickets'?item.title:
              active==='quotes'?item.service:item.title,
            active==='contacts'?([item.email,item.phone].filter(Boolean).join(' · ')):
            active==='tickets'?item.details:
            active==='quotes'?(Number(item.total_cents||0)/100).toLocaleString('fi-FI',{style:'currency',currency:'EUR'}):
            t.published
          );
          if(active==='contacts'){
            row.appendChild(select(['new','contacted','qualified','won','lost'].map(x=>[x,t[x]]),
              item.stage,v=>idGuard(item.id)&&perform('PATCH',API+'/contacts/'+item.id,{stage:v})));
          }else if(active==='tickets'){
            row.appendChild(select(['open','in_progress','waiting','done'].map(x=>[x,t[x]]),
              item.status,v=>idGuard(item.id)&&perform('PATCH',API+'/tickets/'+item.id,{status:v})));
          }else if(active==='quotes'){
            row.appendChild(el('span','native-record-state',localStatus(item.status,t)));
            if(item.status==='draft'){
              const approve=button(t.approve,'button');
              approve.addEventListener('click',()=>{
                if(idGuard(item.id))perform('PATCH',API+'/quotes/'+item.id,{status:'approved'});
              });
              row.appendChild(approve);
            }
          }else if(active==='docs'){
            const remove=button(t.remove,'button');
            remove.addEventListener('click',()=>{
              if(idGuard(item.id)&&window.confirm(t.confirmDelete))
                perform('DELETE',API+'/documents/'+item.id);
            });
            row.appendChild(remove);
          }
          list.appendChild(row);
        }
        if(!rows.length)list.appendChild(el('p','native-empty',t.empty));
      }
      content.appendChild(list);
    }
    load();
    if(active==='zendesk')loadZendesk();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();