(() => {
  const page = document.querySelector('[data-comparison]');
  if (!page) return;
  const config = JSON.parse(document.getElementById('comparison-config').textContent);
  const choices = [...page.querySelectorAll('[data-compare-choice]')];
  const table = page.querySelector('[data-comparison-table]');
  const status = page.querySelector('[data-comparison-status]');
  const cards = [...page.querySelectorAll('[data-comparison-card]')];
  const form = page.querySelector('[data-finder]');
  const result = page.querySelector('[data-finder-result]');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function renderTable() {
    const selected = choices.filter(input => input.checked).map(input => config.cards.find(card => card.id === input.value));
    table.innerHTML = '<caption>Direkter Vergleich der ausgewählten Optionen. Strategische Einordnung von Heidewitzka.</caption><thead><tr><th scope="col">Entscheidungsfrage</th>' + selected.map(card => '<th scope="col">' + escape(card.name) + '</th>').join('') + '</tr></thead><tbody>' + config.rows.map(row => '<tr><th scope="row">' + escape(row.label) + '</th>' + selected.map(card => '<td>' + escape(card[row.key]) + '</td>').join('') + '</tr>').join('') + '</tbody>';
    status.textContent = selected.length ? selected.length + ' von ' + config.cards.length + ' Optionen ausgewählt. Für einen direkten Vergleich zwei oder drei markieren.' : 'Bitte mindestens zwei Optionen in den Steckbriefen markieren.';
    table.closest('.article-table-wrap').hidden = selected.length === 0;
  }
  choices.forEach(input => input.addEventListener('change', () => {
    if (choices.filter(choice => choice.checked).length > 3) {
      input.checked = false;
      status.textContent = 'Bis zu drei Optionen lassen sich vergleichen. Bitte zuerst eine Auswahl entfernen.';
      return;
    }
    renderTable();
  }));
  function recommend(goal, offer, resources) {
    if (config.kind === 'google') {
      if (offer === 'app') return {ids:['app'],title:'App-Kampagnen gezielt prüfen.',text:'Für Installationen und wertvolle Aktionen in einer App gibt es eine eigene Kampagnenlogik. Zuerst festlegen, welche Nutzung wirtschaftlich zählt und wie sie gemessen wird.'};
      if (goal === 'return') return {ids:['display','demand-gen'],title:'Bekannte Interessenten gezielt zurückholen.',text:'Display oder Demand Gen können eine passende Erinnerung liefern. Auswahl, verfügbare eigene Daten und kontrollierte Erweiterungen müssen zum Remarketing-Ziel passen. Den zusätzlichen Beitrag prüfen.'};
      if (goal === 'awareness') return resources === 'video' ? {ids:['video','demand-gen'],title:'YouTube und visuelle Einstiege prüfen.',text:'Video-Kampagnen passen zu einer bewussten Reichweitenaufgabe. Demand Gen ist eine Alternative, wenn Interesse auch in konkrete Handlungen übersetzt werden soll. Beide bekommen eine klar getrennte Erfolgsmessung.'} : {ids:['display','demand-gen'],title:'Mit guten Bildmotiven Reichweite aufbauen.',text:'Display und bildbasierte Demand-Gen-Anzeigen sind mögliche Einstiege. Die Botschaft muss ohne lange Erklärung verständlich sein; Reichweite und spätere Wirkung getrennt beurteilen.'};
      if (goal === 'demand') return resources === 'lean' ? {ids:['search'],title:'Den Einstieg zunächst konzentrieren.',text:'Mit wenig Material vorhandene problembezogene Suchnachfrage prüfen. Für Nachfrageaufbau anschließend eine konkrete Bild- oder Videoidee entwickeln. Ein zusätzlicher Kanal ersetzt kein überzeugendes Argument.'} : {ids:['demand-gen','search'],title:'Interesse auslösen und entstehende Nachfrage auffangen.',text:'Demand Gen kann den Nutzen visuell vermitteln. Search greift passende Suchanfragen auf. Dafür braucht es eine Zielseite, die den Einstieg fortsetzt, und eine gemeinsame Betrachtung der Wirkung.'};
      if (offer === 'shop' && goal === 'sales') return {ids:['shopping','pmax'],title:'Produktkampagnen als erste Optionen prüfen.',text:'Standard Shopping bietet einen konzentrierten Produktvergleich; PMax verfolgt wertvolle Ergebnisse über mehrere Google-Kanäle. Ein aktueller Feed und verlässliche Kaufwerte sind für die Entscheidung zentral. Kein pauschaler Gewinner.'};
      return {ids:['search','pmax'],title:'Suchnachfrage zuerst bewerten, PMax als Ergänzung prüfen.',text:'Search ist ein nachvollziehbarer Einstieg bei konkretem Bedarf. PMax kommt als Ergänzung infrage, wenn Angebot, Messung und genügend hochwertige Ergebnisse eine breitere Optimierung tragen.'};
    }
    if (goal === 'return') return {ids:['display','social'],title:'Eine passende Erinnerung statt neuer Streuung.',text:'Display und Social können bekannte Interessenten erneut ansprechen. Remarketing ist hier die Einsatzstrategie. Aussage, Zeitabstand, verfügbare Listen und tatsächliche zusätzliche Ergebnisse entscheiden.'};
    if (goal === 'awareness') return resources === 'video' ? {ids:['video','display'],title:'Reichweite mit klarer Botschaft planen.',text:'Video vermittelt mehr Kontext; Display kann die Botschaft in weiteren Umfeldern wiederholen. Die Planung braucht eine passende Zielgruppe, Kontaktstrategie und eine Erfolgsmessung für Bekanntheit.'} : {ids:['social','display'],title:'Mit verständlichen Bildmotiven starten.',text:'Social und Display ermöglichen visuelle Einstiege. Entscheidend ist, ob das Motiv im jeweiligen Umfeld Aufmerksamkeit und eine passende nächste Handlung erzeugt.'};
    if (goal === 'demand') return resources === 'lean' ? {ids:['search','native'],title:'Problembezogene Nachfrage und hilfreiche Inhalte prüfen.',text:'Search kann bereits vorhandene Fragen aufgreifen. Native ist eine spätere Option, wenn ein guter Ratgeber oder Vergleich vorliegt. Zunächst den Inhalt entwickeln, dann seine Bewerbung planen.'} : {ids:['social','video','native'],title:'Das Angebot über einen hilfreichen Einstieg erklären.',text:'Social, Video oder Native können einen relevanten Bedarf sichtbar machen. Für den Start eine klare Botschaft und einen Schwerpunkt wählen. Drei passende Optionen bedeuten keine Empfehlung, alle gleichzeitig zu starten.'};
    if (offer === 'shop' && goal === 'sales') return {ids:['shopping','social'],title:'Produktnachfrage auffangen und visuell erweitern.',text:'Shopping macht Produkte und Preise direkt vergleichbar. Social kann neue Kaufgründe und Anwendungen zeigen. Bestand, Marge, Creatives und tatsächliche Neukundenkosten bestimmen die sinnvolle Reihenfolge.'};
    if (offer === 'b2b') return {ids:['search','social'],title:'Bedarf und berufliche Zielgruppen verbinden.',text:'Search greift konkrete Problem- und Lösungssuchen auf. Paid Social, insbesondere LinkedIn, kann relevante Rollen und Unternehmen erreichen. Qualifizierte Anfragen und Vertriebsergebnisse sind wichtiger als reine Leadmenge.'};
    return {ids:['search','social'],title:'Konkreten Bedarf mit einem überzeugenden Angebot verbinden.',text:'Search ist bei vorhandener Nachfrage ein naheliegender Einstieg. Social kann eine ergänzende Zielgruppe erreichen, wenn Nutzen und Belege im Motiv verständlich werden. Erst einen tragfähigen Schwerpunkt testen.'};
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    const recommendation = recommend(values.get('goal'), values.get('offer'), values.get('resources'));
    result.hidden = false;
    result.innerHTML = '<h3>' + escape(recommendation.title) + '</h3><p>' + escape(recommendation.text) + '</p>' + recommendation.ids.map(id => {
      const card = config.cards.find(card => card.id === id);
      return '<a href="#' + escape(id) + '">' + escape(card.name) + ' ansehen ↗</a>';
    }).join('') + '<p class="finder-caveat">Eine erste Orientierung von Heidewitzka. Suchnachfrage, Wirtschaftlichkeit, Zielgruppengröße und Datenqualität vor einer Budgetentscheidung prüfen.</p>';
    cards.forEach(card => card.classList.toggle('is-suggested', recommendation.ids.includes(card.dataset.comparisonCard)));
    choices.forEach(input => { input.checked = recommendation.ids.includes(input.value); });
    renderTable();
  });
  renderTable();
})();
