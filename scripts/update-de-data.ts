import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as cliProgress from "cli-progress";

type HolidaysResponse = {
    [key: string]: {
        datum: string;
        hinweis: string;
    };
};

type VacationsResponse = {
    start: string;
    end: string;
    year: string;
    stateCode: string;
    name: string;
    slug: string;
}[];

type Holiday = {
    name: string;
    startDate: Date;
    endDate: Date;
    isVacation: boolean;
};

(async () => {
    const HOLIDAYS = "https://feiertage-api.de/api/?jahr={{year}}&nur_land={{state}}";
    const VACATIONS = "https://ferien-api.de/api/v1/holidays/{{state}}/{{year}}"
    const COUNTRY_CODE = "DE";
    const states = ["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"];
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

    const progressbar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressbar.start(years.length * states.length, 0);

    for (const state of states) {
        const statePath = path.join(__dirname, "..", "data", COUNTRY_CODE, state);
        if (!fs.existsSync(statePath)) {
            fs.mkdirSync(statePath, { recursive: true });
        }
        for (const year of years) {
            const holidays_url = replaceParams(HOLIDAYS, year, state);
            const vacations_url = replaceParams(VACATIONS, year, state);
            const holidays = (await axios.get(holidays_url)).data as HolidaysResponse;
            const vacations = (await axios.get(vacations_url)).data as VacationsResponse;
            const holidaysAndVacations: Holiday[] = [];
            for (const [name, data] of Object.entries(holidays)) {
                holidaysAndVacations.push({
                    isVacation: false,
                    startDate: new Date(data.datum),
                    endDate: new Date(data.datum),
                    name,
                });
            }
            for (const data of vacations) {
                holidaysAndVacations.push({
                    isVacation: true,
                    startDate: new Date(data.start),
                    endDate: new Date(data.end),
                    name: data.name[0].toUpperCase() + data.name.substr(1),
                });
            }
            fs.writeFileSync(path.join(statePath, `${year}.json`), JSON.stringify(holidaysAndVacations, undefined, 4));
            progressbar.increment();
        }
    }
    progressbar.stop();
    console.log(`\n\nData for ${COUNTRY_CODE} (${states.length} states) for the years ${years[0]} - ${years[years.length - 1]} updated successfully.`);
})()

function replaceParams(url: string, year: number, state: string) {
    return url.replace("{{year}}", year.toString()).replace("{{state}}", state);
}
