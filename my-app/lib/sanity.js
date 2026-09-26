
// Sanity API URL provided by user
// Sanity API URL provided by user
const SANITY_API_URL = process.env.EXPO_PUBLIC_SANITY_API_URL;

export const getStudentByGR = async (grNumber) => {
    try {
        // Construct GROQ query to find student by grNumber
        // Check BOTH string and number variations to be safe
        // Check BOTH string and number variations to be safe
        const query = `*[_type == "student" && (grNumber == "${grNumber}" || grNumber == ${grNumber})][0]{
            _id,
            fullName,
            grNumber,
            rollNumber,
            admissionFor,
            photo {
                asset->{
                    url
                }
            }
        }`;
        const encodedQuery = encodeURIComponent(query);

        const url = `${SANITY_API_URL}?query=${encodedQuery}&perspective=drafts`;

        console.log("Fetching Student URL:", url);

        const response = await fetch(url);
        const json = await response.json();

        console.log("Sanity Response:", JSON.stringify(json, null, 2));

        // Sanity returns result in { result: ... }
        return json.result;
    } catch (error) {
        console.error("Error fetching student from Sanity:", error);
        throw error; // Propagate error so ScannerScreen sees it
    }
};

export const authenticateStudent = async (grNumber, cnic) => {
    try {
        console.log(`Authenticating GR: ${grNumber}, CNIC: ${cnic}`);

        // Query to match GR AND (cnicOrBform OR fatherCnic)
        // We clean the CNIC input of dashes just in case, but usually best to exact match

        const query = `*[_type == "student" && (grNumber == "${grNumber}" || grNumber == ${grNumber}) && (cnicOrBform == "${cnic}" || fatherCnic == "${cnic}")][0]{..., photo { asset-> { url } }}`;

        const encodedQuery = encodeURIComponent(query);
        const url = `${SANITY_API_URL}?query=${encodedQuery}&perspective=drafts`;

        const response = await fetch(url);
        const json = await response.json();

        if (!json.result) {
            return null;
        }

        return json.result;
    } catch (error) {
        console.error("Authentication Error:", error);
        return null;
    }
};

export const getAllStudents = async () => {
    try {
        // Fetch all student documents, requesting specific fields
        const query = `*[_type == "student"]{
            _id,
            fullName,
            fatherName,
            dob,
            fatherCnic,
            rollNumber,
            grNumber,
            gender,
            admissionFor,
            nationality,
            cnicOrBform,
            phoneNumber,
            address,
            photo {
                asset->{
                    url
                }
            }
        }`;
        const encodedQuery = encodeURIComponent(query);
        const url = `${SANITY_API_URL}?query=${encodedQuery}&perspective=drafts`;

        const response = await fetch(url);
        const json = await response.json();

        return json.result || [];
    } catch (error) {
        console.error("Error fetching all students:", error);
        return [];
    }
};

// ========== NEW: Student Portal APIs ==========

export const getScheduleByClass = async (className) => {
    try {
        const query = `*[_type == "schedule" && className == "${className}"][0]{...}`;
        const encodedQuery = encodeURIComponent(query);
        const url = `${SANITY_API_URL}?query=${encodedQuery}&perspective=drafts`;

        const response = await fetch(url);
        const json = await response.json();

        return json.result || null;
    } catch (error) {
        console.error("Error fetching schedule:", error);
        return null;
    }
};

export const getQuizResultsByGR = async (grNumber) => {
    try {
        const query = `*[_type == "quizResult" && studentGrNumber == "${grNumber}"] | order(submittedAt desc) {..., quiz-> { title, subject }}`;
        const encodedQuery = encodeURIComponent(query);
        const url = `${SANITY_API_URL}?query=${encodedQuery}&perspective=drafts`;

        const response = await fetch(url);
        const json = await response.json();

        return json.result || [];
    } catch (error) {
        console.error("Error fetching quiz results:", error);
        return [];
    }
};

export const getNotices = async (className) => {
    try {
        // Get notices: targetType='all' OR (targetType='class' AND className matches)
        // Order by headline first, then createdAt
        const query = `*[_type == "notice" && (targetType == "all" || (targetType == "class" && className == "${className}"))] | order(isHeadline desc, createdAt desc) {...}`;
        const encodedQuery = encodeURIComponent(query);
        const url = `${SANITY_API_URL}?query=${encodedQuery}&perspective=drafts`;

        console.log("[Sanity] Fetching Notices URL:", url);

        const response = await fetch(url);
        const json = await response.json();

        return json.result || [];
    } catch (error) {
        console.error("Error fetching notices:", error);
        return [];
    }
};

export const getFeesByGR = async (grNumber) => {
    try {
        // Query fees by following the student reference
        const query = `*[_type == "fee" && student->grNumber == "${grNumber}"] | order(paidDate desc) {...}`;
        const encodedQuery = encodeURIComponent(query);
        const url = `${SANITY_API_URL}?query=${encodedQuery}&perspective=drafts`;

        const response = await fetch(url);
        const json = await response.json();

        return json.result || [];
    } catch (error) {
        console.error("Error fetching fees:", error);
        return [];
    }
};
