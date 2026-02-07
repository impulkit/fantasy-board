import fetch from 'node-fetch';

export async function GET(request: Request) {
    const response = await fetch('https://external-api.com/cricket'); // Replace with the actual external API endpoint
    const data = await response.json();

    // Here you would typically process and sync the data into your database
    // For example:
    // await saveCricketData(data);

    return new Response(JSON.stringify(data), { status: 200 });
}