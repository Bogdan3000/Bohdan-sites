function openModal(recipeId) {
    const modal = document.getElementById('recipe-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    // Убираем класс анимации появления для перезагрузки
    body.classList.remove('fade-in');
    
    switch (recipeId) {
        case 'kjott':
            title.textContent = 'Kjøttrett';
            body.innerHTML = `
                <h3>Ingredienser:</h3>
                <ul>
                    <li>500 g kjøtt</li>
                    <li>2 gulrøtter</li>
                    <li>1 løk</li>
                    <li>2 hvitløksfedd</li>
                    <li>2 dl kjøttbuljong</li>
                    <li>Krydder etter smak</li>
                </ul>
                <h3>Fremgangsmåte:</h3>
                <ol>
                    <li>Skjær kjøttet i terninger.</li>
                    <li>Stek kjøttet i en gryte.</li>
                    <li>Tilsett hakket løk og hvitløk.</li>
                    <li>Ha i grønnsakene og buljongen.</li>
                    <li>La det småkoke i 1 time.</li>
                </ol>`;
            break;
        case 'fisk':
            title.textContent = 'Fiskrett';
            body.innerHTML = `
                <h3>Ingredienser:</h3>
                <ul>
                    <li>400 g fisk</li>
                    <li>1 sitron</li>
                    <li>Dill</li>
                    <li>Salt og pepper</li>
                </ul>
                <h3>Fremgangsmåte:</h3>
                <ol>
                    <li>Krydre fisken med salt og pepper.</li>
                    <li>Legg fisken i en ildfast form.</li>
                    <li>Press sitronsaft over fisken.</li>
                    <li>Strø dill over og stek i ovnen på 200 grader i 20 minutter.</li>
                </ol>`;
            break;
        case 'suppe':
            title.textContent = 'Suppe';
            body.innerHTML = `
                <h3>Ingredienser:</h3>
                <ul>
                    <li>3 poteter</li>
                    <li>2 gulrøtter</li>
                    <li>1 løk</li>
                    <li>1 liter grønnsaksbuljong</li>
                    <li>Salt og pepper</li>
                </ul>
                <h3>Fremgangsmåte:</h3>
                <ol>
                    <li>Skrell og skjær grønnsakene.</li>
                    <li>Kok opp buljongen.</li>
                    <li>Tilsett grønnsakene og la det koke i 20 minutter.</li>
                    <li>Kjør suppen glatt med stavmikser.</li>
                </ol>`;
            break;
        case 'crepes':
            title.textContent = 'Crepes';
            body.innerHTML = `
                <h3>Ingredienser:</h3>
                <ul>
                    <li>5 egg</li>
                    <li>50 g sukker</li>
                    <li>5 dl melk</li>
                    <li>50 g smør</li>
                    <li>5 dl hvetemel</li>
                    <li>1 ts salt</li>
                    <li>Nugatti og/eller is til servering</li>
                </ul>
                <h3>Fremgangsmåte:</h3>
                <ol>
                    <li>Smelt smøret og la det avkjøle litt.</li>
                    <li>Visp sammen egg og sukker til eggedosis.</li>
                    <li>Bland i melk og mel, og tilsett smør og salt.</li>
                    <li>La røren hvile i 10 minutter før steking.</li>
                    <li>Stek pannekakene på begge sider til de er gylne.</li>
                    <li>Server med blåbær, sukker og/eller stekt bacon.</li>
                </ol>`;
            break;
        case 'smultringer':
            title.textContent = 'Smultringer';
            body.innerHTML = `
                <h3>Ingredienser:</h3>
                <ul>
                    <li>500 g hvetemel</li>
                    <li>100 g sukker</li>
                    <li>1 ts natron</li>
                    <li>2 egg</li>
                    <li>2 dl melk</li>
                    <li>Fritert olje</li>
                </ul>
                <h3>Fremgangsmåte:</h3>
                <ol>
                    <li>Bland alle ingrediensene sammen.</li>
                    <li>Form deigen til runde smultringer.</li>
                    <li>Friter i olje til de er gyldne.</li>
                    <li>Dryss sukker og kanel over før servering.</li>
                </ol>`;
            break;
        case 'boller':
            title.textContent = 'Boller';
            body.innerHTML = `
                <h3>Ingredienser:</h3>
                <ul>
                    <li>500 g hvetemel</li>
                    <li>100 g sukker</li>
                    <li>1 pakke tørrgjær</li>
                    <li>2 dl melk</li>
                    <li>100 g smør</li>
                    <li>1 egg</li>
                </ul>
                <h3>Fremgangsmåte:</h3>
                <ol>
                    <li>Smelt smøret og bland med melk.</li>
                    <li>Tilsett sukker, gjær og egg.</li>
                    <li>Bland inn hvetemelet og elt deigen.</li>
                    <li>La heve i 1 time.</li>
                    <li>Form til boller og stek i 15-20 minutter på 200 grader.</li>
                </ol>`;
            break;
    }

    // Добавляем класс анимации появления
    body.classList.add('fade-in');
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('recipe-modal');
    modal.style.display = 'none';
}

// Закрываем модальное окно, если кликнули вне его
window.onclick = function(event) {
    const modal = document.getElementById('recipe-modal');
    if (event.target == modal) {
        closeModal();
    }
}
