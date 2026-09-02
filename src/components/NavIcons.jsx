// piccola libreria di icone a tratto, stesso stile delle icone già
// disegnate a mano in DrinkCard/Explore (stroke sottile, currentColor):
// usate nella navbar e nelle scorciatoie in home, così la stessa forma
// aiuta a riconoscere la stessa funzione nei due punti

function IconSearch() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <circle cx="7" cy="7" r="4.75" />
            <path d="M10.5 10.5 L14 14" strokeLinecap="round" />
        </svg>
    );
}

function IconGlass() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.2 3H12.8L8.4 8.2V13" />
            <path d="M6 13H10.8" />
        </svg>
    );
}

function IconStar() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 1.6 L9.9 5.9 L14.5 6.4 L11 9.5 L12 14 L8 11.7 L4 14 L5 9.5 L1.5 6.4 L6.1 5.9 Z" />
        </svg>
    );
}

function IconBottle() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6.4 1.5H9.6V3.7C10.6 4.4 11.2 5.5 11.2 6.7V13.2C11.2 13.9 10.6 14.5 9.9 14.5H6.1C5.4 14.5 4.8 13.9 4.8 13.2V6.7C4.8 5.5 5.4 4.4 6.4 3.7V1.5Z" />
            <path d="M4.9 9.4H11.1" strokeWidth="1.1" />
        </svg>
    );
}

function IconParty() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="5.3" cy="5" r="2" />
            <path d="M1.7 13.3C1.7 11 3.2 9.6 5.3 9.6S8.9 11 8.9 13.3" />
            <circle cx="11.3" cy="6.1" r="1.6" />
            <path d="M9 13.2C9 11.3 10 10.2 11.3 10.2S13.7 11.3 13.8 13.1" />
        </svg>
    );
}

function IconUser() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="8" cy="5.4" r="2.7" />
            <path d="M2.8 14C2.8 11 5 9.2 8 9.2S13.2 11 13.2 14" />
        </svg>
    );
}

function IconHome() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 7.2 L8 2 L14 7.2" />
            <path d="M3.4 6.1V13.5H12.6V6.1" />
            <path d="M6.3 13.5V9.6H9.7V13.5" />
        </svg>
    );
}

function IconPlus() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M8 2.5V13.5" />
            <path d="M2.5 8H13.5" />
        </svg>
    );
}

// il glifo "✓" dei font non è mai centrato nel proprio riquadro (varia
// da font a font), quindi per i pallini "ce l'hai già" usiamo un
// tratto disegnato apposta: il path è costruito per avere il centro
// esatto in (8,8), cosi' si allinea da solo dentro il cerchio con un
// semplice grid place-items:center
function IconCheck() {
    return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.8 8.4 L6.6 11.2 L12.2 4.8" />
        </svg>
    );
}

function IconTicket() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 2.4H13V13.6L11.4 12.4 9.8 13.6 8 12.4 6.2 13.6 4.6 12.4 3 13.6Z" />
            <path d="M5.2 5.6H10.8" strokeWidth="1.1" />
            <path d="M5.2 8.2H10.8" strokeWidth="1.1" />
        </svg>
    );
}

function IconShaker() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5.5 1.5H10.5V3.3C11.5 3.9 12.1 4.9 12.1 6V13C12.1 13.8 11.4 14.5 10.6 14.5H5.4C4.6 14.5 3.9 13.8 3.9 13V6C3.9 4.9 4.5 3.9 5.5 3.3V1.5Z" />
            <path d="M4 6.6H12" strokeWidth="1.1" />
            <path d="M4.3 9.7H11.7" strokeWidth="1.1" />
        </svg>
    );
}

export {
    IconSearch,
    IconGlass,
    IconStar,
    IconBottle,
    IconParty,
    IconUser,
    IconCheck,
    IconHome,
    IconPlus,
    IconTicket,
    IconShaker
};
